/**
 * Count the number of stamp nodes stuck to a given node.
 *
 * Any STAMP — whether the dot-voting '+1', a thumbs-up, fire, or other emoji
 * stamp — represents a vote or endorsement in a FigJam workshop context.
 *
 * Note: FigJam's native Voting Widget (WidgetNode) stores vote counts in
 * widgetSyncedState, which is only readable by the widget's own plugin.
 * Only stamp-based reactions are accessible here via node.stuckNodes.
 */
export function countVotes(stuckNodes: readonly SceneNode[]): number {
  return stuckNodes.filter((n): n is StampNode => n.type === 'STAMP').length
}

