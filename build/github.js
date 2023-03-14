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
const github_1 = __importDefault(require("@actions/github"));
require("lodash/partition");
const yaml_1 = __importDefault(require("yaml"));
function fetch_config() {
    return __awaiter(this, void 0, void 0, function* () {
        const context = get_context();
        const octokit = get_octokit();
        const config_path = get_config_path();
        const { data: response_body } = yield octokit.repos.getContent({
            owner: context.repo.owner,
            repo: context.repo.repo,
            path: config_path,
            ref: context.ref,
        });
        return yaml_1.default.parse(response_body.content);
    });
}
function get_reviews() {
    return __awaiter(this, void 0, void 0, function* () {
        const context = get_context();
        const octokit = get_octokit();
        let reviewsResult = yield octokit.pulls.listReviews({
            owner: context.repo.owner,
            repo: context.repo.repo,
            pull_number: context.payload.pull_request.number
        });
        return reviewsResult.data;
    });
}
/* Private */
let octokit_cache = null;
let context_cache = null;
let token_cache = null;
let config_path_cache = null;
function get_context() {
    return context_cache || (context_cache = github_1.default.context);
}
function get_token() {
    return token_cache || (token_cache = core.getInput('token'));
}
function get_config_path() {
    return config_path_cache || (config_path_cache = core.getInput('config'));
}
function get_octokit() {
    const token = get_token();
    return octokit_cache || (octokit_cache = github_1.default.getOctokit(token));
}
function clear_cache() {
    context_cache = null;
    token_cache = null;
    config_path_cache = null;
    octokit_cache = null;
}
exports.default = {
    fetch_config,
    get_reviews,
    clear_cache,
};
