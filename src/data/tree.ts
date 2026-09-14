export interface TreeFile {
  kind: 'file';
  id: string;
  label: string;
  path: string;
}

export interface TreeDir {
  kind: 'dir';
  id: string;
  label: string;
  children: TreeNode[];
}

export type TreeNode = TreeFile | TreeDir;

export const tree: TreeNode[] = [
  { kind: 'file', id: 'about', label: 'about.md', path: 'about.md' },
  {
    kind: 'dir',
    id: 'research',
    label: 'research',
    children: [
      { kind: 'file', id: 'research', label: 'overview.md', path: 'research/overview.md' },
      { kind: 'file', id: 'mhd-simulations', label: 'mhd-simulations.md', path: 'research/mhd-simulations.md' },
      { kind: 'file', id: 'dynamo', label: 'dynamo.md', path: 'research/dynamo.md' },
    ],
  },
  { kind: 'file', id: 'publications', label: 'publications.md', path: 'publications.md' },
  { kind: 'file', id: 'employment', label: 'employment.md', path: 'employment.md' },
  { kind: 'file', id: 'education', label: 'education.md', path: 'education.md' },
  { kind: 'file', id: 'experience', label: 'experience.md', path: 'experience.md' },
  { kind: 'file', id: 'conferences', label: 'conferences.md', path: 'conferences.md' },
  { kind: 'file', id: 'contact', label: 'contact.md', path: 'contact.md' },
];

export const files: TreeFile[] = (function flatten(nodes: TreeNode[]): TreeFile[] {
  return nodes.flatMap((node) => (node.kind === 'file' ? [node] : flatten(node.children)));
})(tree);

export function fileById(id: string): TreeFile | undefined {
  return files.find((file) => file.id === id);
}
