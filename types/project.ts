// Row shape of public.projects. Column names are quoted mixed-case in Postgres.

export interface ProjectRow {
  /** bigint primary key */
  id: number;
  created_at: string;
  NameProjek: string;
  RepoUrl: string;
  DefaultBranch: string;
}

export type ProjectInsert = Pick<ProjectRow, "NameProjek" | "RepoUrl"> &
  Partial<Pick<ProjectRow, "DefaultBranch">>;

/** Minimal project reference attached to issues returned by the API. */
export interface ProjectSummary {
  id: string;
  name: string;
}
