'use strict';
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
const core_1 = __importDefault(require("@actions/core"));
const github_1 = __importDefault(require("./github"));
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        core_1.default.info('Fetching configuration file from input "config"...');
        let config;
        try {
            config = yield github_1.default.fetch_config();
        }
        catch (error) {
            if (error.status === 404) {
                core_1.default.warning('No configuration file is found in the base branch; terminating the process');
                return;
            }
            throw error;
        }
        let reviews = yield github_1.default.get_reviews();
        let requirementCounts = {};
        let requirementMembers = {};
        for (let req in config.groups) {
            requirementCounts[req] = config.groups[req].required;
            requirementMembers[req] = config.groups[req].members;
        }
        let processedReviewers = [];
        for (let i = 0; i < reviews.length; i++) {
            let review = reviews[i];
            let userName = review.user.login;
            if (!processedReviewers.includes(userName)) {
                processedReviewers.push(userName);
                for (let req in requirementMembers) {
                    if (requirementMembers[req].includes(userName)) {
                        requirementCounts[req]--;
                    }
                }
            }
        }
        for (let req in requirementCounts) {
            if (requirementCounts[req] > 0) {
                core_1.default.setFailed('Missing one or more required approvers.');
            }
        }
    });
}
module.exports = {
    run,
};
// Run the action if it's not running in an automated testing environment
if (process.env.NODE_ENV !== 'automated-testing') {
    run().catch((error) => core_1.default.setFailed(error));
}
