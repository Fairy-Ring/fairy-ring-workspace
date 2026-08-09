/**
 * Harness nav surface — classic mode PathFinder + WalkExecutor + path paint.
 * Decision 005: full rs2b0t classic stack (not thin WalkAlong).
 */
import { walkTo, WalkExecutor, type WalkToOpts, type WalkOptions } from './WalkExecutor.ts';
import {
    ensureNav,
    findPath,
    navReady,
    getFinder
} from './NavigatorMain.ts';
import { PathPublish } from '../pathPublish.ts';
import {
    isNavPaintEnabled,
    setNavPaintEnabled,
    setNavPaintDefaults,
    getNavPaintDefaults,
    isClientTrailEnabled,
    startPathPaintLoop,
    stopPathPaintLoop
} from './pathPaintDom.ts';
import {
    PathCameraFollow,
    isNavCameraFollowEnabled,
    setNavCameraFollow,
    pathFacingYaw
} from './cameraFollow.ts';

export {
    ensureNav,
    findPath,
    navReady,
    getFinder,
    walkTo,
    WalkExecutor,
    type WalkToOpts,
    type WalkOptions,
    PathPublish,
    isNavPaintEnabled,
    setNavPaintEnabled,
    setNavPaintDefaults,
    getNavPaintDefaults,
    isClientTrailEnabled,
    startPathPaintLoop,
    stopPathPaintLoop,
    PathCameraFollow,
    isNavCameraFollowEnabled,
    setNavCameraFollow,
    pathFacingYaw
};

export const Traversal = {
    walkTo
};
