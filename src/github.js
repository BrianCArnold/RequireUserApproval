'use strict';

const core = require('@actions/core');
const fs = require('fs');
const github = require('@actions/github');
const partition = require('lodash/partition');
const yaml = require('yaml');
const { LOCAL_FILE_MISSING } = require('./constants');

async function fetch_config() {
  const context = get_context();
  const octokit = get_octokit();
  const config_path = get_config_path();
  let content = '';

  const { data: response_body } = await octokit.repos.getContent({
    owner: context.repo.owner,
    repo: context.repo.repo,
    path: config_path,
    ref: context.ref,
  });

  content = Buffer.from(response_body.content, response_body.encoding).toString();

  return yaml.parse(content);
}

function get_pull_request() {
  const context = get_context();

  return new PullRequest(context.payload.pull_request);
}


async function get_reviews() {
  const context = get_context();
  const octokit = get_octokit();

  let reviewsResult = await octokit.pulls.listReviews({
    owner: context.repo.owner,
    repo: context.repo.repo,
    pull_number: context.payload.pull_request.number
  });
  return reviewsResult.data;
}

/* Private */

let context_cache;
let token_cache;
let config_path_cache;

function get_context() {
  return context_cache || (context_cache = github.context);
}

function get_token() {
  return token_cache || (token_cache = core.getInput('token'));
}

function get_config_path() {
  return config_path_cache || (config_path_cache = core.getInput('config'));
}


function get_octokit() {
  // if (octokit_cache) {
  //   return octokit_cache;
  // }

  const token = get_token();
  return octokit_cache = github.getOctokit(token);
}

function clear_cache() {
  context_cache = undefined;
  token_cache = undefined;
  config_path_cache = undefined;
  octokit_cache = undefined;
}

module.exports = {
  get_pull_request,
  fetch_config,
  get_reviews,
  clear_cache,
};
