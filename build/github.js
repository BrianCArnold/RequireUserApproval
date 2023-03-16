"use strict";
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
const github = __importStar(require("@actions/github"));
const partition_1 = __importDefault(require("lodash/partition"));
const yaml_1 = __importDefault(require("yaml"));
const teams = {};
function getTeamMembers(teamName) {
    return __awaiter(this, void 0, void 0, function* () {
        const context = get_context();
        const octokit = get_octokit();
        const members = yield octokit.teams.listMembersInOrg({
            org: context.repo.owner,
            team_slug: teamName
        });
        let teamMembers = [];
        for (let i = 0; i < members.data.length; i++) {
            let member = members.data[i];
            teamMembers.push(member.login);
        }
        teams[teamName] = teamMembers;
        return teamMembers;
    });
}
function assign_reviewers(group) {
    return __awaiter(this, void 0, void 0, function* () {
        const context = get_context();
        const octokit = get_octokit();
        if (context.payload.pull_request == undefined) {
            throw 'Pull Request Number is Null';
        }
        const [teams_with_prefix, individuals] = (0, partition_1.default)(group.members, member => member.startsWith('team:'));
        const teams = teams_with_prefix.map((team_with_prefix) => team_with_prefix.replace('team:', ''));
        return octokit.pulls.requestReviewers({
            owner: context.repo.owner,
            repo: context.repo.repo,
            pull_number: context.payload.pull_request.number,
            reviewers: individuals,
            team_reviewers: teams,
        });
    });
}
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
        var ymlContent = Buffer.from(response_body.content, 'base64').toString();
        return yaml_1.default.parse(ymlContent);
    });
}
function fetch_changed_files() {
    return __awaiter(this, void 0, void 0, function* () {
        const context = get_context();
        if (!context.payload.pull_request) {
            throw 'No pull request found.';
        }
        const octokit = get_octokit();
        const changed_files = [];
        const per_page = 100;
        let page = 0;
        let number_of_files_in_current_page;
        do {
            page += 1;
            const { data: response_body } = yield octokit.pulls.listFiles({
                owner: context.repo.owner,
                repo: context.repo.repo,
                pull_number: context.payload.pull_request.number,
                page,
                per_page,
            });
            number_of_files_in_current_page = response_body.length;
            changed_files.push(...response_body.map((file) => file.filename));
        } while (number_of_files_in_current_page === per_page);
        return changed_files;
    });
}
function get_reviews() {
    return __awaiter(this, void 0, void 0, function* () {
        const octokit = get_octokit();
        const context = get_context();
        if (!context.payload.pull_request) {
            throw 'No pull request found.';
        }
        const result = [];
        const per_page = 100;
        let page = 0;
        let number_of_files_in_current_page;
        do {
            page += 1;
            const reviewsResult = yield octokit.pulls.listReviews({
                owner: context.repo.owner,
                repo: context.repo.repo,
                pull_number: context.payload.pull_request.number,
                page: page,
                per_page: per_page
            });
            number_of_files_in_current_page = reviewsResult.data.length;
            result.push(...reviewsResult.data);
        } while (number_of_files_in_current_page === per_page);
        return result;
    });
}
let cacheContext = null;
let cacheToken = null;
let cacheConfigPath = null;
let cacheOctoKit = null;
let get_context = () => cacheContext || (cacheContext = github.context);
let get_token = () => cacheToken || (cacheToken = core.getInput('token'));
let get_config_path = () => cacheConfigPath || (cacheConfigPath = core.getInput('config'));
let get_octokit = () => cacheOctoKit || (cacheOctoKit = github.getOctokit(get_token()));
exports.default = {
    fetch_config,
    get_reviews,
    fetch_changed_files,
    assign_reviewers,
    getTeamMembers
};
