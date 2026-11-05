# FastAPI Best Architecture Plugins

This is the central repository containing the extensions available for [FastAPI Best Architecture](https://github.com/fastapi-practices/fastapi_best_architecture).

## Getting started

See the [plugins docs](https://fastapi-practices.github.io/fastapi_best_architecture_docs/plugin/before.html) for how to develop and publish your plugin.

Looking for plugin ideas? please check [issues](https://github.com/fastapi-practices/plugins/issues).

## Plugin submission

Open a [plugin submission issue](https://github.com/fastapi-practices/plugins/issues/new?template=plugin-submission.yml) after the plugin repository is public and passes local validation. The workflow validates the repository structure and `plugin.toml`, then opens a marketplace pull request for review.

The automation intentionally does not execute plugin code. Maintainers must configure the `PLUGIN_SUBMISSION_TOKEN` repository secret with permission to push bot branches and open pull requests. A personal access token is required instead of the default `GITHUB_TOKEN` so the PR can trigger the normal validation workflow. The token does not need issue permissions because issue comments use the repository `GITHUB_TOKEN`.
