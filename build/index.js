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
        core.info('Fetching configuration file from input "config"...');
        let config;
        try {
            config = yield github_1.default.fetch_config();
        }
        catch (error) {
            if (error.status === 404) {
                core.warning('No configuration file is found in the base branch; terminating the process');
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
                core.setFailed('Missing one or more required approvers.');
            }
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
