'use strict';
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const github_1 = __importDefault(require("./github"));
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        core.info('Fetching configuration...');
        let config;
        try {
            config = yield github_1.default.fetch_config();
        }
        catch (error) {
            if (error.status === 404) {
                core.warning('No configuration file is found in the base branch; terminating the process');
            }
            throw error;
        }
        core.debug("Config: ");
        core.debug(JSON.stringify(config, null, '\t'));
        core.info('Getting reviews...');
        let reviews = yield github_1.default.get_reviews();
        let requirementCounts = {};
        let requirementMembers = {};
        core.debug('Retrieving required group configurations...');
        for (let req in config.groups) {
            core.debug(` - Group: ${req}`);
            requirementCounts[req] = config.groups[req].required;
            requirementMembers[req] = {};
            core.debug(` - Requiring ${config.groups[req].required} of the following:`);
            for (let i in config.groups[req].members) {
                let member = config.groups[req].members[i];
                requirementMembers[req][member] = false;
                core.debug(`   - ${member}`);
            }
        }
        let reviewerState = {};
        core.info('Getting most recent review for each reviewer...');
        for (let i = 0; i < reviews.length; i++) {
            let review = reviews[i];
            let userName = review.user.login;
            let state = review.state;
            reviewerState[userName] = state;
        }
        core.debug('Processing reviews...');
        for (let userName in reviewerState) {
            let state = reviewerState[userName];
            if (state == 'APPROVED') {
                for (let group in requirementMembers) {
                    for (let member in requirementMembers[group]) {
                        if (member == userName) {
                            requirementMembers[group][member] = true;
                        }
                    }
                }
            }
        }
        let failed = false;
        let failedStrings = "";
        core.info('Checking for required reviewers...');
        for (let group in requirementMembers) {
            let groupCountRequired = requirementCounts[group];
            let groupMemberApprovals = requirementMembers[group];
            yield github_1.default.explainStatus(group, groupMemberApprovals, groupCountRequired);
            // if (groupCount >= requirementCounts[group]) {
            //   //Enough Approvers
            //   core.info(`Required Approver count met from group: ${group}.`);
            // } else {
            //   failed = true;
            //   //Not enough approvers.
            //   failedStrings += `Missing ${requirementCounts[group] - groupCount} Required Approvers from group: ${group}:\n`;
            //   for (let member in groupMembers) {
            //     let status = groupMembers[member] ? '✅' : '❌';
            //     failedStrings += ` - ${member} ${status}\n`;
            //   }
            // }
        }
    });
}
module.exports = {
    run,
};
// Run the action if it's not running in an automated testing environment
if (process.env.NODE_ENV !== 'automated-testing') {
    run().catch((error) => {
        console.log(error);
        core.setFailed(error);
    });
}
