// Which projects a signed-in profile may see: developers see every project, reporters only their own
// (projects.profil_id = profile ID). Issues and Bob jobs follow the visibility of their project.

export type Scope = { all: true } | { all: false; projectIds: Set<string> };

export const canSeeProject = (scope: Scope, projectId: string | null | undefined) =>
  scope.all || (!!projectId && scope.projectIds.has(String(projectId)));

export function scopeWorkspace<P extends { id: string }, I extends { id: string; ProjekId: string }, J extends { issue_id: string }>(
  scope: Scope, data: { projects: P[]; issues: I[]; jobs: J[] },
) {
  if (scope.all) return data;
  const issues = data.issues.filter(issue => canSeeProject(scope, issue.ProjekId));
  const issueIds = new Set(issues.map(issue => issue.id));
  return {
    projects: data.projects.filter(project => canSeeProject(scope, project.id)),
    issues,
    jobs: data.jobs.filter(job => issueIds.has(String(job.issue_id))),
  };
}
