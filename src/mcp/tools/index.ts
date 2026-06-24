import { ToolDef } from '../registerTool.js';
import { z } from 'zod';
import { addSampleTool, listSamplesTool, deleteSampleTool } from './samples.js';
import { wipeAllTool } from './wipe.js';
import { auditListTool } from './audit.js';
import { setProviderTool, testKeyTool } from './provider.js';
import {
  getProfileTool,
  buildProfileTool,
  updateProfileTool,
  deleteProfileTool,
} from './profile.js';
import { humanifyTextTool } from './rewrite.js';
import { recordFeedbackTool } from './feedback.js';
import { importChatExportTool, importTextFilesTool } from './importers.js';

export const ALL_TOOLS: ToolDef<z.ZodTypeAny, z.ZodTypeAny>[] = [
  humanifyTextTool,
  recordFeedbackTool,
  addSampleTool,
  listSamplesTool,
  deleteSampleTool,
  getProfileTool,
  buildProfileTool,
  updateProfileTool,
  deleteProfileTool,
  setProviderTool,
  testKeyTool,
  auditListTool,
  wipeAllTool,
  importChatExportTool,
  importTextFilesTool,
];
