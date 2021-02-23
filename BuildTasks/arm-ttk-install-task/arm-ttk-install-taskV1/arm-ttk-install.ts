import * as path from 'path';
import * as fs from 'fs';
import { platform } from 'os';
import * as taskLib from 'azure-pipelines-task-lib/task';
import * as toolLib from 'azure-pipelines-tool-lib/tool';

async function downloadLatest(): Promise<string> {
    // Reference: https://github.com/Microsoft/azure-pipelines-tool-lib/blob/master/docs/overview.md#azure-pipelines-tool-lib
    try {
        const ttkUri = "https://aka.ms/arm-ttk-latest";
        taskLib.debug(`Downloading ZIP from ${ttkUri}`);
        const downloadPath = await toolLib.downloadTool(ttkUri);
        taskLib.debug(`Successfully downloaded ZIP to ${downloadPath}`);
        const toolPath =  await toolLib.extractZip(downloadPath);
        taskLib.debug(`Successfully extracted ZIP to ${toolPath}`);
        return path.join(toolPath, 'arm-ttk');
    } catch (err) {
        taskLib.setResult(taskLib.TaskResult.Failed, err.message);
        throw err;
    }
}

async function run() {
    taskLib.setResourcePath(path.join(__dirname, 'task.json'));
    try {
        const toolName = platform() === 'win32' ? 'Test-AzTemplate.cmd' : 'Test-AzTemplate.sh';
        const toolVersion = "0.1.1"
        taskLib.setVariable('ARMTTK_TOOL_NAME', toolName);
        taskLib.setVariable('ARMTTK_TOOL_VERSION', toolVersion);

        let toolPath = toolLib.findLocalTool(toolName, toolVersion);
        if (!toolPath) {
            taskLib.debug('ARM TTK not found cached in agent...');
            const clone: boolean = taskLib.getBoolInput('clone', false);
            if (clone) {
                // const gitRepoUrl = "";

            } else {
                toolPath = await downloadLatest();
                toolPath = await toolLib.cacheDir(path.dirname(toolPath), toolName, toolVersion);
                taskLib.debug(`ARM TTK version ${toolVersion} cached`);
            }
        }
        toolLib.prependPath(toolPath);
        // arm-ttk needs to be in front of armTtkFile
        const armTtkFile = path.join(toolPath, 'arm-ttk', toolName);
        taskLib.setVariable('ARMTTK_PATH', armTtkFile);
        fs.chmodSync(armTtkFile, '755');
        taskLib.debug('Added tool to PATH');
    } catch (err) {
        taskLib.setResult(taskLib.TaskResult.Failed, err.message);
    }
}

void run();
