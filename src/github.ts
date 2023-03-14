'use strict';

import * as core from '@actions/core';
import github from '@actions/github';
import 'lodash/partition';
import yaml from 'yaml';


async function fetch_config() {
  const context = get_context();
  const octokit = get_octokit();
  const config_path = get_config_path();

  const { data: response_body } = await octokit.repos.getContent({
    owner: context.repo.owner,
    repo: context.repo.repo,
    path: config_path,
    ref: context.ref,
  });

  return yaml.parse(response_body.content);
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
let octokit_cache: any = null;
let context_cache: any = null;
let token_cache: any = null;
let config_path_cache: any = null;

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
  const token = get_token();
  return octokit_cache || (octokit_cache = github.getOctokit(token));
}

function clear_cache() {
  context_cache = null;
  token_cache = null;
  config_path_cache = null;
  octokit_cache = null;
}

export default {
  fetch_config,
  get_reviews,
  clear_cache,
};
