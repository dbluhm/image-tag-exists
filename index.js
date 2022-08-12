const core = require('@actions/core');
const github = require('@actions/github');
const axios = require('axios').default;


const alphaNumeric = '[a-z0-9]+';
const separator = '(?:[._]|__|[-]*)';
const nameComponent = `${alphaNumeric}(?:${separator}${alphaNumeric})*`;
const domainNameComponent = '(?:[a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9])';
const domainName = `${domainNameComponent}(?:\\.${domainNameComponent})*`;
const ipv6address = '\\[(?:[a-fA-F0-9:]+)\\]';
const host = `(?:${domainName}|${ipv6address})`;
const domain = `${host}(?:[:][0-9]+)?`;
const domainRegExp = new RegExp(domain);
const tagRegExp = /^[\w][\w.-]{0,127}$/;
const name = `^(${domain}/)?(${nameComponent}(?:/${nameComponent})*)$`;
const nameRegExp = new RegExp(name);


function main() {
  try {
    const imageTag = core.getInput('tag');
    const username = core.getInput('username')
    const password = core.getInput('password')
    const token = core.getInput('token')
    core.info(`Checking ${registry} for tag ${imageTag}`)

    if (imageTag.split(':').length - 1 != 2) {
      core.setFailed('Improperly formatted tag, expected something like example/image:tag');
      return;
    }

    const [fullname, tag] = imageTag.split(':', 2);

    if (!tag.match(tagRegExp) || !fullname.match(nameRegExp)) {
      core.setFailed('Improperly formatted tag, expected something like example/image:tag');
      return;
    }

    const [registry, name] = fullname.match(nameRegExp);

    axios.get(
      `https://${registry}/v2/${name}/tags/list`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    ).then(res => {
      if (res.status >= 200 && res.status < 400) {
        if ('tags' in res.data) {
          core.setOutput('exists', res.data.tags.includes(tag));
        }
      } else {
        core.setOutput('exists', false);
      }
    }).catch(error => {
      core.setOutput('exists', false);
    });
  } catch (error) {
    core.setFailed(error.message);
  }
}

main();
