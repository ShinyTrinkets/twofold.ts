function getRandomDialog() {
  const dialog = ['MORE!', 'Mooore!!', 'We need more!', 'More of me!', 'More, more, more!'];
  const randomIndex = Math.floor(Math.random() * dialog.length);
  return dialog[randomIndex];
}

export function smith(_s: any, _a: any, meta: Record<string, any>) {
  /**
   * Agent Smith tag, that creates clones if itself.
   * Demonstrates how to create a tag with animations,
   * and how to use the meta object to modify the tree.
   */
  if (!meta.node.children) {
    meta.node.children = [];
  }
  const oldChildren = meta.node.children;
  meta.node.children.unshift({
    rawText: getRandomDialog(),
  });
  meta.node.children = [
    {
      rawText: '\n',
    },
    {
      double: true,
      name: 'smithClone',
      firstTagText: '<smithClone>',
      secondTagText: '</smithClone>',
      children: oldChildren,
    },
    {
      rawText: '\n',
    },
  ];
  return meta.node;
}

export function neo(_s: any, _a: any, meta: Record<string, any>) {
  /**
   * Matrix Neo tag, that destroys Smith agents inside it.
   * Demonstrates how to create a tag with animations,
   * and how to use the meta object to modify the tree.
   */
  if (!meta.node.children) {
    meta.node.children = [];
  }
  if (meta.node.children.length === 1 && !meta.node.children[0].name) {
    meta.node.children = [];
  }
  for (const child of meta.node.children) {
    if (child.name === 'smith' || child.name === 'smithClone') {
      meta.node.children = child.children;
      break;
    }
  }
  return meta.node;
}
