import { Router } from 'express';
import { body } from 'express-validator';
import { EPoint, PathList } from 'src/types/path-find.types';
import { drone } from 'src/utils/constants';
import { getPaths } from 'src/utils/path-find.helpers';
import { validate } from 'src/utils/validation';

const router = Router();

router.get('/', (req, res) => {
  res.send(
    `After figuring out the correct landing zone, ${drone} needs to figure out the shortest path to get there.

It is guided by satellite S1, telling it the different paths it can take to the landing zone and the distance between each.

Currently, the API doesn't finish and overloads the server. We're cheap, so we don't want to allocate bigger resources for this.

So your task is to update the API to correctly return the shortest path between the starting and ending coordinates provided.

The API accepts a start and end value, with both being values that represent a valid point on the map (A, B, C,... F).
It should then return the shortest path between the start and end points in the form of an array that represents the order of the path that ${drone} should take and the total distance.`,
  );
});

router.post(
  '/',
  validate(
    body(['start', 'end'], 'Not a valid point').isIn(Object.values(EPoint)),
  ),
  async (req, res) => {
    try {
      const { start, end } = req.body;
      const paths = await getPaths();
      const path = findShortestPath(paths, start, end);
      return res.status(200).send(path);
    } catch (e: any) {
      console.error(e);
      return res.status(500).send({
        error: e.message,
      });
    }
  },
);

const findShortestPath = (
  paths: PathList,
  startNode: string,
  endNode: string,
) => {
  // track distances from the start node using a hash object
  const distances: Record<string, number> = {};
  for (const vertex in paths) {
    distances[vertex] = vertex === startNode ? 0 : Infinity;
  }

  // track paths using a hash object
  const parents: Record<string, string | null> = { [endNode]: null };
  for (const child in paths[startNode]) {
    parents[child] = startNode;
  }

  // collect visited nodes
  const visited: Set<string> = new Set<string>();
  // find the nearest node
  let node = shortestDistanceNode(distances, visited);

  // for that node:
  while (node) {
    // find its distance from the start node & its child nodes
    const distance = distances[node];
    const children = paths[node];

    // for each of those child nodes:
    for (const child in children) {
      // save the distance from the start node to the child node
      const newdistance = distance + children[child];
      // if there's no recorded distance from the start node to the child node in the distances object
      // or if the recorded distance is shorter than the previously stored distance from the start node to the child node
      if (distances[child] > newdistance) {
        // save the distance to the object
        distances[child] = newdistance;
        // record the path
        parents[child] = node;
      }
    }
    // move the current node to the visited set
    visited.add(node);
    // move to the nearest neighbor node
    node = shortestDistanceNode(distances, visited);
  }

  // using the stored paths from start node to end node
  // record the shortest path
  const shortestPath = [endNode];
  let parent = parents[endNode];
  while (parent) {
    shortestPath.unshift(parent);
    parent = parents[parent];
  }

  //this is the shortest path
  const results = {
    distance: distances[endNode],
    path: distances[endNode] === Infinity ? [] : shortestPath,
  };
  // return the shortest path & the end node's distance from the start node
  return results;
};

const shortestDistanceNode = (
  distances: Record<string, number>,
  visited: Set<string>,
) => {
  // create a default value for shortest
  let shortest: string | null = null;

  // for each node in the distances object
  for (const node in distances) {
    // if no node has been assigned to shortest yet
    // or if the current node's distance is smaller than the current shortest
    // and if it's not yet visited then it's considered the shortest
    shortest =
      (shortest === null || distances[node] < distances[shortest]) &&
      !visited.has(node)
        ? node
        : shortest;
  }
  return shortest;
};

export default router;
