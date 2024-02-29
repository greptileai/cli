const path = require('path');
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

function serializeRepoKey(repoKey) {
  const { remote, branch, repository } = repoKey;
  return `${remote}:${branch}:${repository}`;
}
function parseIdentifier(input) {
  if (!isDomain(input)) {
    const regex = /^(([^:]*):([^:]*):|[^:]*)([^:]*)$/;
    const match = input.match(regex);
    if (!match) return null;
    const keys = input.split(":");
    if (keys.length === 1)
      return serializeRepoKey({
        remote: "github",
        branch: "",
        repository: keys[0],
      });
    if (keys.length === 3) {
      let remote = keys[0],
        branch = keys[1],
        repository = keys[2];
      if (remote === "azure" && repository.split("/").length == 2) {
        let repository_list = repository.split("/");
        repository_list.push(repository_list[1]);
        repository = repository_list.join("/");
      }
      return serializeRepoKey({
        remote: remote,
        branch: branch,
        repository: repository,
      });
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
    return { remote, branch , repository };
    
  } catch (e) {
    return null;
  }
};


const x = (parseIdentifier('https://github.com/Dhruv317/HighPeakSWInternship'));
console.log(typeof x)
console.log(x.repository)