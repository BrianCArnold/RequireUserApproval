# Require User Approval

![CI](https://github.com/BrianCArnold/require-user-approval/workflows/CI/badge.svg)

A GitHub Action automatically checks to make sure that certain required users have approved a pull request.

## Configuration
You need to prepare two YAML files for:

- Reviewers configuration
- Workflow configuration

### Reviewers configuration

The format of a configuration file is as follows:

```yaml
groups:
  # The default reviewers
  review-group-all: # This group requires all 4 users to approve a PR.
    members:
      - username1
      - username2
      - username3
      - username4
    required: 4 # the number of members from this group that need to approve a PR.

  review-group-some: # This group requires any 2 users to approve a PR.
    members:
      - username5
      - username6
      - username7
    required: 2

  review-group-any: #This only requires any one user from this group to approve a PR.
    members:
      - username8
      - username9
    required: 1 # the number of members from this group that need to approve a PR.

```

Important note: Currently, this doesn't check to make sure that the number of required approvals for a group is less than or equal to the number of members specified. Don't set it to require more users than are in the group.

The default configuration file location is `.github/require_reviewers.yml` but you can override it in your workflow configuration file.

### Workflow configuration
Create a workflow file in `.github/workflows` (e.g. `.github/workflows/require_reviewers.yml`):

```yaml
name: Require User Approval

on:
  pull_request_review:
    types: [editted, submitted]

jobs:
  require_user_approval:
    name: Require User Approval
    runs-on: ubuntu-latest
    steps:
      - name: Request review based on files changes and/or groups the author belongs to
        uses: BrianCArnold/require-user-approval@v0.0.1
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          config: .github/require_reviewers.yml # Config file location override
```

### Thanks to necojackarc's auto-request-review, which this is largely based on.