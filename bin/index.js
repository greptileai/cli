#!/usr/bin/env node
const yargs = require("yargs");
const fs = require('fs');
const path = require('path');
// const configPath = 'config.json';
const currentDirectory = __dirname;
const configPath = path.join(currentDirectory, 'config.json');
const sessionPath = path.join(currentDirectory, 'session.json');
const fetch = require('node-fetch');
const { Base64 } = require('js-base64');
const open = require('open');
const readline = require('readline');
const clipboardy = require('clipboardy');
const ora = require('ora');
const spinner = ora();
const exec = require('child_process').exec;
// GitHub credentials
let clientId = '3b18d3e6e037d70908ac';

clientId = 'Iv1.1bfb3337c164d452'
// clientId = '42a2bd08980b5a89a820'
let firstTime = true;
const scope = 'read:user user:email';
const githubEndpoint = 'https://github.com/login/device/code';
let access_token = null;
const { promisify } = require('util');
const setTimeoutPromise = promisify(setTimeout);
const debugMode = false;
const payloadFilePath = path.resolve(__dirname, 'payload.json');

const executeAuthCommand = async () => {
  if (!isAuthenticated()) {
    console.log("Redirecting to GitHub authentication...");
    let deviceCode;
    let userCode;
    const pollingInterval = 10000;
    let intervalId;

    const initiateDeviceAuthorization = async () => {
      try {
        const response = await fetch(githubEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ client_id: clientId, scope: scope })
        });
        const data = await response.json();

        // console.log('Response:', data);

        deviceCode = data.device_code;
        userCode = data.user_code;

        console.log(`Please go to ${data.verification_uri} and enter the code: ${userCode}`);
        clipboardy.writeSync(userCode);
        await setTimeoutPromise(3000);
        await open(data.verification_uri);
        intervalId = setInterval(checkAuthorization, pollingInterval);
      } catch (error) {
        if (debugMode) { console.log("Error:", error); }
      }
    };

    const checkAuthorization = async () => {
      try {
        const response = await fetch('https://github.com/login/oauth/access_token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            client_id: clientId,
            device_code: deviceCode,
            grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
          })
        });

        const data = await response.json();

        if (data.access_token) {
          clearInterval(intervalId);
          access_token = data.access_token;
          writeConfig(access_token);
          spinner.succeed('Authorization successful');
          process.exit(0);
        } else if (data.error && data.error === 'authorization_pending') {
          if (firstTime) {
            spinner.start('Authorization pending');
            firstTime = false;
          }
        } else {
          clearInterval(intervalId);
          spinner.fail('Authorization failed or expired:', data.error_description)
          process.exit(1);
        }
      } catch (error) {
        if (debugMode) {
          console.error('Error:', error);
        }
      }
    };

    await initiateDeviceAuthorization();


  } else {
    console.log("You are already authenticated");
    process.exit(0);
  }
};

// Command line options and commands
const usage = "\nUsage: greptile <command>";
const options = yargs
  .usage(usage)
  .command("help", "Display help information")
  .command("add <repository>", "Add a repository to the session")
  .command("list", "List repositories in the current session")
  .command("remove <repository>", "Remove a repository from the session")
  .command("start", "Start Greptile application")
  .command("auth", "Redirect to GitHub authentication")
  .command("addPath", "Adds greptie to your Path")
  .demandCommand(1, "Please specify a command.")
  .help(true)
  .argv;

// Command execution based on user input
async function main() {
  if (!fs.existsSync(configPath)) {
    const defaultConfig = {
      github: {
        access_token: null,
      },
    };
    fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2), 'utf-8');
  }

  // Check if session.json exists, create with default content if not
  if (!fs.existsSync(sessionPath)) {
    const defaultSession = {
      repositories: [],
    };
    fs.writeFileSync(sessionPath, JSON.stringify(defaultSession, null, 2), 'utf-8');
  }

  // Check if payload.json exists, create with default content if not
  if (!fs.existsSync(payloadFilePath)) {
    const defaultPayload = {
      messages: [],
      repositories: [],
      sessionId: '',
      user: {
        email: '',
        token: {
          github: '',
        },
      },
    };
    fs.writeFileSync(payloadFilePath, JSON.stringify(defaultPayload, null, 2), 'utf-8');
  }

  const command = options._[0];
  switch (command) {

    case "addPath":
      addToPath()
      break;

    case "add":
      await executeAddCommand(options.repository);
      process.exit();
      break;

    case "help":
      executeHelpCommand();
      process.exit();
      break;

    case "start":
      async function runLoop() {
        let isDone = false;
        while (!isDone) {

          let userQuestion = await getUserQuestion();
          if (userQuestion === "exit") {
            isDone = true;
          } else {
            if (hasNoRepositories()) {
              console.log("Please first add repositories to the session using greptile add <repo_link>")
              process.exit(-1)

            }
            else {
              await executeStartCommand(userQuestion);
            }

          }
        }
      }
      runLoop();
      break;

    case "auth":
      executeAuthCommand();

      break;

    case "list":
      executeListCommand();
      process.exit();
      break;

    case "remove":
      executeRemoveCommand(options.repository);
      process.exit();
      break;

    default:
      console.error("Invalid command. Use 'greptile help' for assistance.");
      process.exit();
      break;

  }
}

function executeHelpCommand() {
  console.log("Executing help command...");
}

async function executeAddCommand(repositoryLink) {
  if (!isAuthenticated()) {
    console.error("Error: Please authenticate with GitHub first. Use 'greptile auth' to authenticate.");
    process.exit(1);
  } else {
    if (!repositoryLink) {
      console.error("Error: Please provide a repository name. Example: greptile add owner/repository");
      process.exit(1);
    }

    // Load existing session data
    let sessionData;
    try {
      const sessionFile = fs.readFileSync(sessionPath, 'utf-8');
      sessionData = JSON.parse(sessionFile);
    } catch (error) {
      if (debugMode) {
        console.log(error)
      }
      // If the file doesn't exist or has invalid JSON, start with an empty session
      sessionData = {
        repositories: []
      };
    }
    // Add the new repository to the session
    const parsedRepo = parseIdentifier(repositoryLink)
    try {
      repository = parsedRepo.repository;
      remote = parsedRepo.remote;
      branch = parsedRepo.branch || await getDefaultBranch(remote, repository);
    }
    catch (error) {
      console.log("There was an error processing the repository link. Please check your repository link again")
      process.exit(-1)
    }
    if (typeof repository === 'undefined') {
      console.log("Error: Invalid repository name. Enter github link, e.g. https://github.com/facebook/react")
      process.exit(-1)
    }
    const repoInfo = await getRepoInfo(repository, remote, branch);

    try {
      if (debugMode) {
        console.log(repoInfo)
      }

      if (repoInfo.responses[0]) {
        await writeRepoToFile(repositoryLink);
      }
      else {
        // Check whether this is supposed to be here
        if (repoInfo.failed[0] && repoInfo.failed[0].repository == repository) {
          if (repoInfo.failed[0].statusCode === 400) {
            console.log(`Error ${repoInfo.failed[0].statusCode}: Bad Request`);
          } else if (repoInfo.failed[0].statusCode === 401) {
            console.log(`Error ${repoInfo.failed[0].statusCode}: Unauthorized`);
          } else if (repoInfo.failed[0].statusCode === 404) {
            if (repoInfo.failed[0].message && repoInfo.failed[0].message == "Repository not processed by Greptile.") {
              await writeRepoToFile(repositoryLink);
              const processRepo = await getRepo(repository);
              if (debugMode) {
                console.log(processRepo)
              }
            }
            else {
              console.log(`Error ${repoInfo.failed[0].statusCode}: Not Found`);
            }
          } else if (repoInfo.failed[0].statusCode === 500) {
            console.log(`Error ${repoInfo.failed[0].statusCode}: Internal Server Error`);
          } else {
            console.log(`Error ${repoInfo.failed[0].statusCode}: Unhandled Status Code`);
          }
          process.exit(1)
        }
        await getRepo(repository);
      }
    } catch (error) {
      if (debugMode) { console.error(error) }
      if (repoInfo.failed[0] && repoInfo.failed[0].repository == repository) {
        if (repoInfo.failed[0].statusCode === 400) {
          console.log(`Error ${repoInfo.failed[0].statusCode}: Bad Request`);
        } else if (repoInfo.failed[0].statusCode === 401) {
          console.log(`Error ${repoInfo.failed[0].statusCode}: Unauthorized`);
        } else if (repoInfo.failed[0].statusCode === 404) {
          if (repoInfo.failed[0].message && repoInfo.failed[0].message == "Repository not processed by Greptile.") {
            await writeRepoToFile(repositoryLink);
            const processRepo = await getRepo(repository);
            if (debugMode) { console.log(processRepo) }
          }
          else {
            console.log(`Error ${repoInfo.failed[0].statusCode}: Not Found`);
          }
        } else if (repoInfo.failed[0].statusCode === 500) {
          console.log(`Error ${repoInfo.failed[0].statusCode}: Internal Server Error`);
        } else {
          console.log(`Error ${repoInfo.failed[0].statusCode}: Unhandled Status Code`);
        }
        process.exit(1)
      }
    }
    // console.log(response)
    // Write the updated session data back to the file
  }
}

async function writeRepoToFile(repositoryLink) {
  let sessionData;
  try {
    const sessionFile = fs.readFileSync(sessionPath, 'utf-8');
    sessionData = JSON.parse(sessionFile);
  } catch (error) {
    // If the file doesn't exist or has invalid JSON, start with an empty session
    sessionData = {
      repositories: []
    };
  }

  // Check if the repository link already exists
  if (!sessionData.repositories.includes(repositoryLink)) {
    try {
      sessionData.repositories.push(repositoryLink);
      const sessionFile = JSON.stringify(sessionData, null, 2);
      fs.writeFileSync(sessionPath, sessionFile, 'utf-8');
      console.log(`Repository '${repositoryLink}' added to the session.`);

      // Update payload.json with the new session data
      const payload = await createPayload2("", createSessionId());
      writePayloadToFile(payload);

    } catch (error) {
      console.error('Error writing session data to file:', error);
    }
  } else {
    console.log(`Repository '${repositoryLink}' already exists in the session.`);
  }
}

function executeListCommand() {
  if (!isAuthenticated()) {
    console.error("Error: Please authenticate with GitHub first. Use 'greptile auth' to authenticate.");
    process.exit(1);
  } else {
    // Load existing session data
    let sessionData;
    try {
      const sessionFile = fs.readFileSync(sessionPath, 'utf-8');
      sessionData = JSON.parse(sessionFile);
    } catch (error) {
      // If the file doesn't exist or has invalid JSON, start with an empty session
      sessionData = {
        repositories: []
      };
    }

    // Display the list of repositories in the current session
    const repositories = sessionData.repositories;
    if (repositories.length === 0) {
      console.log("No repositories in the current session.");
    } else {
      console.log("Repositories in the current session:");
      repositories.forEach((repoLink, index) => {
        const repo = parseIdentifier(repoLink).repository;
        console.log(`${index + 1}. ${repo}`);
      });
    }
  }
}

function executeRemoveCommand(repository) {
  if (!isAuthenticated()) {
    console.error("Error: Please authenticate with GitHub first. Use 'greptile auth' to authenticate.");
    process.exit(1);
  } else {
    if (!repository) {
      console.error("Error: Please provide a repository name. Example: greptile remove owner/repository or https://github.com/facebook/react");
      process.exit(1);
    }

    // Load existing session data
    let sessionData;
    try {
      const sessionFile = fs.readFileSync(sessionPath, 'utf-8');
      sessionData = JSON.parse(sessionFile);
    } catch (error) {
      // If the file doesn't exist or has invalid JSON, start with an empty session
      sessionData = {
        repositories: []
      };
    }

    // Check if the repository exists in the session
    const index = sessionData.repositories.findIndex((repo) => repo.includes(repository));
    if (index === -1) {
      console.log(`Repository '${repository}' not found in the current session.`);
    } else {
      // Remove the repository from the session
      sessionData.repositories.splice(index, 1);

      // Write the updated session data back to the file
      try {
        const sessionFile = JSON.stringify(sessionData, null, 2);
        fs.writeFileSync(sessionPath, sessionFile, 'utf-8');
        console.log(`Repository '${repository}' removed from the session.`);
      } catch (error) {
        if (debugMode) {
          console.error('Error writing session data to file:', error);
        }
      }
    }
  }
}
// Function to execute the start command
// Inside executeStartCommand function
async function executeStartCommand(userQuestion) {
  try {
    if (!isAuthenticated()) {
      console.error("Error: Please authenticate with GitHub first. Use 'greptile auth' to authenticate.");
      process.exit(1);
    } else {

      await useChatApi(userQuestion);
    }
  }

  catch (error) {
    if (debugMode) {
      console.log(error)
    }
    process.exit(-1)

  }
}

async function getUserQuestion() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  function getActualQuestion() {
    return new Promise((resolve) => {
      rl.question('\n\n Question: (Hint: Type "exit" to exit)  ', (answer) => {
        resolve(answer);
      });

    });
  }
  const userQuestion = await getActualQuestion();
  rl.close();
  return userQuestion;


}
async function getRepo(repo, branch = "main", remote = "github") {
  try {
    const body = JSON.stringify({
      "remote": remote, // one of "github", "gitlab" for now
      "repository": repo, // formatted as owner/repository
      // "branch": "main", // optional, defaults to repo default on GH/GL
      // "reload": true, // optional, if false will not reprocess if previously successful, default true
      // "notify": true // optional, whether to notify the user when finished, default true
    })
    const repoInfo = await fetch("https://api.greptile.com/v1/repositories", {
      method: "POST",
      body: body,
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + getAccessToken()
      },
    });

    const repoInfoJson = await repoInfo.json();
    return repoInfoJson;
  } catch (error) {
    if (debugMode) {
      console.log("Error:", error);
    }
    return null;
  }
}

async function getRepoInfo(repo, remote, branch) {
  // console.log("Called getRepoInfo with:", repo, remote, branch)
  const repoInfo = await fetch('https://api.greptile.com/v1/repositories/batch?repositories=' + getBase64(remote, repo, branch), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + getAccessToken()
    },
  });

  const repoInfoJson = await repoInfo.json();

  return repoInfoJson;
}

async function useChatApi(userQuestion) {
  const session_id = createSessionId();
  // userQuestion = "What does this repo do?"
  // repository = 'onboardai/onboard-vscode'
  // branch = 'main'
  let payload = readPayloadFromFile();

  // If the payload is empty, create a new payload with the user's question
  if (payload.messages.length === 0) {
    if (debugMode) {
      console.log("Payload is Empty, creating new Payload")
    }
    payload = await createPayload2(userQuestion, session_id);
  } else {
    if (debugMode) {
      console.log("Appending user Message to Payload")
    }
    // If the payload already has messages, append the user's new question
    payload = appendMessageToPayload(payload, userQuestion);
  }
  if (debugMode) {
    console.log(payload)
  }

  try {
    const response = await fetch("https://api.greptile.com/v1/query", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        "Authorization": "Bearer " + getAccessToken()
      },
      body: JSON.stringify(payload),
    })
    if (debugMode) {
      console.log("Response: ", response)
    }

    let buffer = '';
    decoder = new TextDecoder();
    fullResponse = ""
    for await (const chunk of response.body) {
      const chunkText = decoder.decode(chunk);
      // console.log(chunkText)
      buffer += chunkText;
      const lines = buffer.split(/\r?\n/);
      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i].trim();

        if (line.length > 0) {
          try {
            const jsonData = JSON.parse(line);
            // console.log('JSONDATA: ',jsonData)
            if (jsonData.type == "status") {
              if (jsonData.message == '') {
                // console.log(" d :, ", fullResponse)
                appendMessageToPayload(payload, fullResponse);
                // process.exit(0)
              }
              console.log(jsonData.message)
              if (jsonData.message == "Started processing request") {
                spinner.start();
              }
              if (jsonData.message == "Writing response") {
                spinner.succeed('Request processed successfully');
              }

            }
            else {
              if (typeof jsonData.message === 'string') {
                fullResponse += jsonData.message;
              }
              process.stdout.write(jsonData.message)
            }
          } catch (error) {
            // console.error('Error parsing JSON:', error);
          }
        }
      }

      buffer = lines[lines.length - 1];
    }


  } catch (error) {

    if (debugMode) {
      console.error('Error:', error.message);
    }
    // Handle errors here
  }
}

function isAuthenticated() {
  try {
    const configFile = fs.readFileSync(configPath, 'utf-8');
    const configFileData = JSON.parse(configFile)

    if (configFileData.github.access_token != null) {
      access_token = configFileData.github.access_token
      return true;
    }
    else {
      return false;
    }
  } catch (error) {
    if (debugMode) {
      console.log(error)
    }
    return {};
  }
}

function getAccessToken() {
  try {
    const configFile = fs.readFileSync(configPath, 'utf-8');
    const configFileData = JSON.parse(configFile)

    if (configFileData.github.access_token != null) {
      access_token = configFileData.github.access_token
      return access_token;
    }
    else {
      return null;
    }
  } catch (error) {
    if (debugMode) {
      console.log(error)
    }
    return {};
  }
}

async function getDefaultBranch(remote, repository) {
  // console.log("Called getDefaultBranch with:", remote, repository)

  const token = getAccessToken();
  const url = remote === "github" ? `https://api.github.com/repos/${repository}`
  // TODO: Add full support for other remotes
    // : remote === "gitlab" ? `https://gitlab.com/api/v4/projects/${repository}`
    // : remote === "bitbucket" ? `https://api.bitbucket.org/2.0/repositories/${repository}`
    // : remote === "azure" ? `https://dev.azure.com/${repository}/_apis/git/repositories`
    // : remote === "visualstudio" ? `https://dev.azure.com/${repository}/_apis/git/repositories`
    : null;

  if (!url) return "main";

  try {
    const data = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }).then((response) => {
      return response.json();
    });
    return data.default_branch;
  } catch (error) {
    if (debugMode) {
      console.error('Error:', error);
    }
    return "main";
  }
}

function writeConfig(access__token) {
  // Create and write to the file
  const config = {
    "github": {
      "access_token": access__token
    }
  };
  const configFile = JSON.stringify(config, null, 2);

  try {
    fs.writeFileSync(configPath, configFile, 'utf-8');
    if (debugMode) {
      console.log('File written successfully');
    }
  } catch (err) {
    if (debugMode) {
      console.error('Error writing to the file:', err);
    }
  }
}

function getBase64(remote, repository, branch) {
  let repo = remote + ":" + repository + ":" + branch;
  if (debugMode) {
    console.log(repo)
  }
  return (Base64.encode(repo))
}

function createSessionId() {
  return Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15);
}

async function createPayload2(userQuestion, session_id, remote = "github", branch = "main", external = false) {
  // Load existing session data
  let sessionData;
  try {
    const sessionFile = fs.readFileSync(sessionPath, 'utf-8');
    sessionData = JSON.parse(sessionFile);
  } catch (error) {
    // If the file doesn't exist or has invalid JSON, start with an empty session
    sessionData = {
      repositories: []
    };
  }

  const payload = {
    messages: [
      {
        id: '1',
        role: "user",
        content: userQuestion
      }
    ],
    repositories: await Promise.all(sessionData.repositories.map(async (repo) => {
      const parsedRepo = parseIdentifier(repo);
      return {
        remote: parsedRepo.remote,
        name: parsedRepo.repository,
        branch: parsedRepo.branch || await getDefaultBranch(parsedRepo.remote, parsedRepo.repository),
        name: parsedRepo.repository,
        external: external,
      };
    })),
    sessionId: session_id,
  }

  return payload;
}

function readPayloadFromFile() {
  try {
    const payloadFile = fs.readFileSync(payloadFilePath, 'utf-8');
    const payload = JSON.parse(payloadFile);

    return payload;
  } catch (error) {
    // If the file doesn't exist or has invalid JSON, return an empty payload
    return {
      messages: [],
      repositories: [],
      sessionId: '',
      user: {
        email: '',
        token: {
          github: '',
        },
      },
    };
  }
}

function writePayloadToFile(payload) {
  try {
    const payloadFile = JSON.stringify(payload, null, 2);
    fs.writeFileSync(payloadFilePath, payloadFile, 'utf-8');
  } catch (error) {
    if (debugMode) {
      console.error('Error writing payload to file:', error);
    }
  }
}

function appendMessageToPayload(payload, content) {
  payload.messages.push({
    id: (payload.messages.length + 1).toString(),
    role: 'user',
    content: content,
  });
  writePayloadToFile(payload);
  return payload;
}

function hasNoRepositories() {
  try {
    const sessionFile = fs.readFileSync(sessionPath, 'utf-8');
    const sessionData = JSON.parse(sessionFile);
    if (debugMode) {
      console.log(sessionData.repositories.length)
    }
    return sessionData.repositories.length === 0;
  } catch (error) {
    if (debugMode) {
      console.log(error)
    }
    // If the file doesn't exist or has invalid JSON, return true (no repositories)
    return true;
  }
}

function parseIdentifier(input) {
  if (!isDomain(input)) {
    const regex = /^(([^:]*):([^:]*):|[^:]*)([^:]*)$/;
    const match = input.match(regex);
    if (!match) return null;
    const keys = input.split(":");
    if (keys.length === 1)
      return {
        remote: "github",
        branch: "",
        repository: keys[0],
      };
    if (keys.length === 3) {
      let remote = keys[0],
        branch = keys[1],
        repository = keys[2];
      if (remote === "azure" && repository.split("/").length == 2) {
        let repository_list = repository.split("/");
        repository_list.push(repository_list[1]);
        repository = repository_list.join("/");
      }
      return {
        remote: remote,
        branch: branch,
        repository: repository,
      };
    }
    return null; // only 2 entries may be ambiguous (1 might be as well...)
  }
  if (!input.startsWith("http")) input = "https://" + input;
  if (input.endsWith(".git")) input = input.slice(0, -4);
  try {
    const url = new URL(input);
    let remote = (() => {
      try {
        const services = ["github", "gitlab", "bitbucket", "azure", "visualstudio"];
        return (services.find((service) => url.hostname.includes(service)) || null)
      } catch (e) {
        return null;
      }
    })();
    if (!remote) return null;
    let repository, branch, regex, match;
    switch (remote) {
      case "github":
        regex =
          /([a-zA-Z0-9\._-]+\/[a-zA-Z0-9\%\._-]+)[\/tree\/]*([a-zA-Z0-0\._-]+)?/;
        match = url.pathname.match(regex);
        repository = decodeURIComponent(match?.[1] || "");
        branch = match?.[2];
        break;
      case "gitlab":
        regex =
          /([a-zA-Z0-9\._-]+\/[a-zA-Z0-9\%\._-]+)(?:\/\-)?(?:(?:\/tree\/)([a-zA-Z0-0\._-]+))?/;
        match = url.pathname.match(regex);
        repository = decodeURIComponent(match?.[1] || "");
        branch = match?.[2];
        break;

      case "azure":
        regex = /([a-zA-Z0-9\%\.\/_-]+)/;
        match = url.pathname.match(regex);
        repository =
          match?.[1].split("/").filter((x) => x !== "_git" && x !== "") || [];
        repository.push(repository?.slice(-1)[0]);
        repository = decodeURIComponent(repository.slice(0, 3).join("/"));
        branch = url.searchParams.get("version")?.slice(2); // remove 'GB' from the beginning
        break;

      case "visualstudio":
        remote = "azure"
        regex = /([a-zA-Z0-9\%\.\/_-]+)/;
        const org = url.hostname.split(".")[0];
        match = url.pathname.match(regex);
        repository =
          match?.[1].split("/").filter((x) => x !== "_git" && x !== "") || [];
        repository = decodeURIComponent([org, ...(repository.slice(0, 2))].join("/"));
        branch = url.searchParams.get("version")?.slice(2); // remove 'GB' from the beginning
        break;
      default:
        return url.hostname;
    }
    if (!repository) return null;
    // console.log(remote,branch,repository)
    return { remote, branch, repository };
  } catch (e) {
    return null;
  }
};

function isDomain(input) {
  try {
    new URL(input);
    const regex = /^(([^:]*):([^:]*):|[^:]*)([^:]*)$/;
    const match = input.match(regex);
    if (match) return false;
    return true;
  } catch (e) {
    return false;
  }
}

function addToPath() {
  // Execute the Bash script
  bashFile = path.join(currentDirectory.replace("/bin", "") + "/addToPath.sh")
  exec(bashFile, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`Error: ${stderr}`);
      return;
    }
    console.log(stdout);
  });
}

main()
