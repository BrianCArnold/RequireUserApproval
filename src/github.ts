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
  const octokit = get_octokit();
  const context = get_context();
  if (!context.payload.pull_request) {
    throw 'No pull request found.';
  }

  let reviewsResult = await octokit.pulls.listReviews({
    owner: context.repo.owner,
    repo: context.repo.repo,
    pull_number: context.payload.pull_request.number
  });
  return reviewsResult.data;
}


function get_context() {
  return github.context;
}

function get_token() {
  return core.getInput('token');
}

function get_config_path() {
  return core.getInput('config');
}


function get_octokit() {
  const token = get_token();
  return github.getOctokit(token);
}

export default {
  fetch_config,
  get_reviews,
};
