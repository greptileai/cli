
# Greptile CLI

Greptile is a Command Line Interface (CLI) that enables developers to search and understand complex codebases in English. Learn more at [greptile.com](https://greptile.com).

## Quickstart

1. **Install greptile via `npm`:**

   ```bash
   npm install -g greptile
   greptile addPath
   ```

   This ensures Greptile is in your system's PATH for global usage. Without the addPath command, you will not be able to use the CLI tool..

2. **Authenticate with GitHub:**

    ```bash
    greptile auth
    ```

3. **Add repositories to the chat session:**

    ```bash
    greptile add [repo link or owner/repo]
    ```

    - For example:

    ```bash
    greptile add https://github.com/facebook/react
    ```

    - or

    ```bash
    greptile add facebook/react
    ```

    You can add up to 10 repositories to the session.

4. **Begin!**

    ```bash
    greptile start
    ```

    This launches a shell allowing you to ask questions to Greptile's AI with full context of the provided repositories.

If you have any questions or comments, email us at founders@greptile.com.

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
greptile add <repository_link or owner/repo>
```

Replace `<repository_link>` with the GitHub repository URL or `<owner/repo>` with the owner and repository name.

### Listing Repositories

To list repositories in the current session, use the following command:

```bash
greptile list
```

### Removing a Repository

To remove a repository from the session, use the following command:

```bash
greptile remove <repository_link or owner/repo>
```

Replace `<repository_link>` with the GitHub repository URL or `<owner/repo>` with the owner and repository name.

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

Feel free to explore and interact with Greptile to manage your repositories efficiently!
```

This version focuses on the essential information and improves the overall organization.
