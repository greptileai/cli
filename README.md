# Greptile CLI

Greptile is a Command Line Interface (CLI) tool for managing and interacting with multiple repositories through a chat-based interface. This tool facilitates the process of querying information, asking questions, and managing tasks across various code repositories.

## How to Download

To use Greptile, you need to have Node.js installed on your machine. You can download and install Node.js from [here](https://nodejs.org/).

Once Node.js is installed, you can download Greptile by cloning the repository:

```bash
git clone https://github.com/dhruv317/greptile.git
```

Navigate to the Greptile directory:

```bash
cd greptile
```

Install the required dependencies:

```bash
npm install
```

## How to Run

You can run Greptile using the following commands:

### Authentication

To authenticate with GitHub, use the following command:

```bash
greptile auth
```

### Adding a Repository

To add a repository to the session, use the following command:

```bash
greptile add <repository_link>
```

Replace `<repository_link>` with the GitHub repository you want to add.

### Listing Repositories

To list repositories in the current session, use the following command:

```bash
greptile list
```

### Removing a Repository

To remove a repository from the session, use the following command:

```bash
greptile remove <repository_link>
```

Replace `<repository_link>` with the GitHub repository you want to remove.

### Starting Greptile

To start the Greptile application and interact with the repositories, use the following command:

```bash
greptile start
```

Follow the prompts to ask questions and retrieve information from the added repositories.

### Help

To display help information, use the following command:

```bash
greptile help
```
Note: The commands assume you are in the Greptile directory. If you want to use the commands globally, you may need to install Greptile globally or add it to your system's PATH.

Feel free to explore and interact with Greptile to manage your repositories efficiently!
