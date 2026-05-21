/**
 * Count the number of '+1' stamp nodes stuck to a given node.
 *
 * Rationale: FigJam's native Voting Widget stores state in
 * WidgetNode.widgetSyncedState, which is only readable by a plugin whose
 * manifest id matches the widget's own widgetId.  An external plugin cannot
 * access those vote counts.  The stamp-based dot-voting pattern (+1 stamps
 * stuck to stickies) IS readable via node.stuckNodes.
 *
 * Limitation documented in README.
 */
export function countVotes(stuckNodes: readonly SceneNode[]): number {
  return stuckNodes.filter(
    (n): n is StampNode => n.type === 'STAMP' && n.name === '+1'
  ).length
}

