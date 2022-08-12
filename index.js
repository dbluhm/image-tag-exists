const core = require('@actions/core');
const axios = require('axios').default;


const alphaNumeric = '[a-z0-9]+';
const separator = '(?:[._]|__|[-]*)';
const nameComponent = `${alphaNumeric}(?:${separator}${alphaNumeric})*`;
const domainNameComponent = '(?:[a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9])';
const domainName = `${domainNameComponent}(?:\\.${domainNameComponent})*`;
const ipv6address = '\\[(?:[a-fA-F0-9:]+)\\]';
const host = `(?:${domainName}|${ipv6address})`;
const domain = `${host}(?:[:][0-9]+)?`;
const tagRegExp = /^[\w][\w.-]{0,127}$/;
const name = `^(${domain}/)?(${nameComponent}(?:/${nameComponent})*)$`;
const nameRegExp = new RegExp(name);

function exists(status) {
  core.info(`Tag exists? ${status}`);
  core.setOutput('exists', status);
  return status;
}

async function run() {
  try {
    const imageTag = core.getInput('tag');
    const username = core.getInput('username')
    const password = core.getInput('password')
    const token = core.getInput('token')
    core.info(`Checking for tag ${imageTag}`)

    if (imageTag.split(':').length != 2) {
      core.setFailed('Improperly formatted tag, expected something like example/image:tag');
      return;
    }

    const [fullname, tag] = imageTag.split(':', 2);
    core.debug(`fullname: ${fullname}, tag: ${tag}`)
    if (!tag.match(tagRegExp) || !fullname.match(nameRegExp)) {
      core.setFailed('Improperly formatted tag, expected something like example/image:tag');
      return;
    }

    const [_, registry, name] = fullname.match(nameRegExp);
    core.debug(`registry: ${registry}, name: ${name}`)
    core.info(`Querying https://${registry.slice(0, -1)}/v2/${name}/tags/list`);

    try {
      const res = await axios.get(
        `https://${registry}/v2/${name}/tags/list`,
        {
          headers: {
            Authorization: `Bearer ${btoa(token)}`
          }
        }
      );
      if ('tags' in res.data) {
        core.debug(JSON.stringify(res.data));
        exists(res.data.tags.includes(tag));
      } else {
        core.info('Got unexpected data back from registry. See debug info for more details.')
        core.debug(JSON.stringify(res.data));
        exists(false);
      }
    } catch(error) {
      core.debug(error.response.status);
      exists(false)
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
