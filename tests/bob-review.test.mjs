import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { join, resolve, relative, isAbsolute } from 'node:path';
import { tmpdir } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import vm from 'node:vm';
import ts from 'typescript';
import { captureArtifact, workspaceHead } from '../lib/bob/artifact.ts';
import { publishArtifact } from '../lib/github/publish.ts';
import { persistReviewArtifact } from '../lib/supabase/review-persistence.ts';

test('artifact persistence retries transient failures without rerunning Bob and reports database errors safely', async()=>{
  let attempts=0;
  await persistReviewArtifact(async()=>++attempts<3?{data:null,error:{code:'',message:'fetch failed'}}:{data:{id:'fixture'},error:null},async()=>{});
  assert.equal(attempts,3);
  await assert.rejects(persistReviewArtifact(async()=>({data:null,error:{code:'42703',message:'private database detail'}}),async()=>{}),/Review columns are missing/);
  await assert.rejects(persistReviewArtifact(async()=>({data:null,error:{code:'42501',message:'private database detail'}}),async()=>{}),error=>/42501/.test(error.message)&&!error.message.includes('private database detail'));
});

const exec = promisify(execFile);
const baseSha = 'a'.repeat(40);
const options = { repoUrl: 'https://github.com/team/demo.git', baseBranch: 'main', branch: 'devresolve/issue-1-job', jobId: 'fixture-job', token: 'fixture-token',
  artifact: { baseSha, patch: 'fixture diff', createdAt: '2026-01-01T00:00:00Z', files: [{ path: 'auth.ts', mode: '100644', content: 'fixed' }] } };

test('artifact survives clone cleanup, captures staged/new/deleted files and rejects secrets', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'devresolve-review-test-'));
  try {
    const git = args => exec('git', args, { cwd: folder });
    await git(['init']);
    await writeFile(join(folder, 'auth.ts'), 'bug\n');
    await writeFile(join(folder, 'old.ts'), 'old\n');
    await git(['add', '.']);
    await git(['-c','user.name=Fixture','-c','user.email=fixture@example.com','commit','-m','fixture']);
    const head = await workspaceHead(folder);
    await writeFile(join(folder, 'auth.ts'), 'fix\n');
    await writeFile(join(folder, 'new.ts'), 'new\n');
    // Target repos may lack .gitignore, and Bob may already have staged outputs.
    for (const dir of ['.next', 'node_modules', 'build', 'packages/demo/.next']) {
      await mkdir(join(folder, dir), { recursive: true });
      await writeFile(join(folder, dir, 'generated.js'), 'generated\n');
    }
    await rm(join(folder, 'old.ts'));
    await git(['add', '-A']);
    const artifact = await captureArtifact(folder, head, []);
    assert.deepEqual(artifact.files.map(f=>f.path), ['auth.ts','new.ts','old.ts']);
    assert.equal(artifact.files.find(f=>f.path==='old.ts').content, null);
    assert.match(artifact.patch, /\+fix/);
    await writeFile(join(folder, 'auth.ts'), 'fixture-private-key');
    await assert.rejects(captureArtifact(folder, head, ['fixture-private-key']), /secret/i);
    await rm(join(folder, 'auth.ts'));
    await writeFile(join(folder, '.env.local'), 'private');
    await assert.rejects(captureArtifact(folder, head, []), /sensitive/i);
    assert.equal(artifact.files.find(f=>f.path==='auth.ts').content, 'fix\n');
  } finally {
    const child = relative(resolve(tmpdir()), resolve(folder));
    assert.ok(child && !child.startsWith('..') && !isAbsolute(child));
    await rm(folder, { recursive: true, force: true });
  }
});

function githubMock({ changedBase=false, exists=false }={}) {
  const calls=[];let message;
  const fetcher=async(url,request)=>{
    calls.push({url,method:request.method,body:request.body});
    assert.equal(request.headers.Authorization,'Bearer fixture-token');
    assert.equal(request.redirect,'error');
    const p=new URL(url).pathname;
    let data={};let status=200;
    if(p.endsWith('/git/ref/heads/devresolve/issue-1-job')){data={object:{sha:'commit'}};if(!exists)status=404;}
    else if(p.endsWith('/git/ref/heads/main'))data={object:{sha:changedBase?'b'.repeat(40):baseSha}};
    else if(p.endsWith('/git/commits/'+baseSha))data={tree:{sha:'base-tree'}};
    else if(p.endsWith('/git/blobs'))data={sha:'blob'};
    else if(p.endsWith('/git/trees'))data={sha:'new-tree'};
    else if(p.endsWith('/git/commits')&&request.method==='POST'){message=JSON.parse(request.body).message;data={sha:'commit'};}
    else if(p.endsWith('/git/commits/commit'))data={message,parents:[{sha:baseSha}]};
    return new Response(JSON.stringify(data),{status});
  };
  return {fetcher,calls,setExists(){exists=true;}};
}

test('approval creates one commit/ref on a fix branch, token is not in bodies or URLs; retry is idempotent', async()=>{
  const mock=githubMock();
  const first=await publishArtifact(options,mock.fetcher);
  assert.match(first.commitUrl,/\/commit\/commit$/);
  assert.equal(mock.calls.filter(c=>c.url.endsWith('/git/refs')).length,1);
  assert.equal(JSON.parse(mock.calls.at(-1).body).ref,'refs/heads/devresolve/issue-1-job');
  assert.ok(mock.calls.every(c=>!['PATCH','PUT','DELETE'].includes(c.method)));
  assert.doesNotMatch(JSON.stringify(mock.calls),/fixture-token/);
  mock.setExists();const count=mock.calls.length;
  await publishArtifact(options,mock.fetcher);
  assert.ok(mock.calls.slice(count).every(c=>c.method==='GET'));
});

test('changed base branch and an unrelated existing fix branch block publication',async()=>{
  const changed=githubMock({changedBase:true});
  await assert.rejects(publishArtifact(options,changed.fetcher),/base branch changed/i);
  assert.ok(changed.calls.every(c=>c.method==='GET'));
  await assert.rejects(publishArtifact(options,githubMock({exists:true}).fetcher),/different content/i);
});

test('review requires same origin and reviewer code; reject and concurrent claims cannot publish',async()=>{
  let published=0,claimed=false;
  const job={status:'READY_FOR_REVIEW',artifact:options.artifact,result:{review:{branch:options.branch}},repo_url:options.repoUrl,base_branch:'main'};
  const modules={
    '@/lib/supabase/bob-store':{getReviewJob:async()=>job,getJob:async()=>job,claimReview:async()=>{if(claimed)return false;claimed=true;return true;},updateJob:async()=>{}},
    '@/lib/github/publish':{publishArtifact:async()=>{published++;return{commitUrl:'fixture'};}},
    'node:crypto':await import('node:crypto'),
    '@/lib/auth/session':{requireRole:()=>null},
  };
  const exports={};
  vm.runInNewContext(ts.transpileModule(await readFile('app/api/bob/jobs/[id]/review/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,
    {exports,require:n=>modules[n],Response,URL,Buffer,Error,process:{env:{DEVRESOLVE_REVIEW_TOKEN:'review-fixture',GITHUB_TOKEN:'fixture'}}});
  const request=(decision,origin='http://localhost',token='review-fixture')=>new Request('http://localhost/api/review',{method:'POST',headers:{origin,'content-type':'application/json','x-review-token':token},body:JSON.stringify({decision})});
  const context={params:Promise.resolve({id:'037ae2c5-26b6-4f13-a4d6-6a396bc33be7'})};
  assert.equal((await exports.POST(request('approve','https://other.example'),context)).status,403);
  assert.equal((await exports.POST(request('approve','http://localhost','wrong'),context)).status,403);
  assert.equal((await exports.POST(request('approve','http://localhost',''),context)).status,403);
  assert.equal((await exports.POST(request('reject','http://localhost',' review-fixture '),context)).status,200);
  assert.equal(published,0);
  assert.equal((await exports.POST(request('approve'),context)).status,409);
  assert.equal(published,0);
  claimed=false;
  assert.equal((await exports.POST(request('approve'),context)).status,200);
  assert.equal(published,1);
});

test('request changes requires feedback, stores it, and never publishes',async()=>{
  let published=0,claimed=null,saved=null;
  const job={id:'037ae2c5-26b6-4f13-a4d6-6a396bc33be7',status:'READY_FOR_REVIEW',review_status:'PENDING',artifact:options.artifact,result:{review:{branch:options.branch,patch:'p'}},repo_url:options.repoUrl,base_branch:'main'};
  const modules={
    '@/lib/supabase/bob-store':{getReviewJob:async()=>job,getJob:async()=>job,
      claimReview:async(_id,decision)=>{claimed=decision;return true;},
      saveReviewFeedback:async(_id,_result,feedback)=>{saved=feedback;},updateJob:async()=>{}},
    '@/lib/github/publish':{publishArtifact:async()=>{published++;return{commitUrl:'fixture'};}},
    'node:crypto':await import('node:crypto'),
    '@/lib/auth/session':{requireRole:()=>null},
  };
  const exports={};
  vm.runInNewContext(ts.transpileModule(await readFile('app/api/bob/jobs/[id]/review/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,
    {exports,require:n=>modules[n],Response,URL,Buffer,Error,process:{env:{DEVRESOLVE_REVIEW_TOKEN:'review-fixture',GITHUB_TOKEN:'fixture'}}});
  const request=body=>new Request('http://localhost/api/review',{method:'POST',headers:{origin:'http://localhost','content-type':'application/json','x-review-token':'review-fixture'},body:JSON.stringify(body)});
  const context={params:Promise.resolve({id:job.id})};
  assert.equal((await exports.POST(request({decision:'request_changes'}),context)).status,400);
  assert.equal((await exports.POST(request({decision:'request_changes',feedback:'   '}),context)).status,400);
  assert.equal((await exports.POST(request({decision:'request_changes',feedback:'x'.repeat(2001)}),context)).status,400);
  assert.equal(claimed,null);
  assert.equal((await exports.POST(request({decision:'request_changes',feedback:'  Also trim whitespace.  '}),context)).status,200);
  assert.equal(claimed,'request_changes');
  assert.equal(saved,'Also trim whitespace.');
  assert.equal(published,0);
  job.review_status='CHANGES_REQUESTED';claimed=null;
  assert.equal((await exports.POST(request({decision:'approve'}),context)).status,200);
  assert.equal(claimed,null,'a review with requested changes cannot be approved afterwards');
  assert.equal(published,0);
});
