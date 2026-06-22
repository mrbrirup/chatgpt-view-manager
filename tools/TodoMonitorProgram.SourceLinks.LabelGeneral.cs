using System.Collections.Concurrent;
using System.Diagnostics;
using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

internal static class Program
{
    private static readonly Encoding Utf8NoBom = new UTF8Encoding(encoderShouldEmitUTF8Identifier: false);

    public static int Main(string[] args)
    {
        var options = CommandLineOptions.Parse(args);

        if (!options.IsValid)
        {
            Console.WriteLine(CommandLineOptions.Usage);
            return 1;
        }

        if (!GitRepository.TryCreate(options.MonitorFolder!, out var repository))
        {
            Console.Error.WriteLine("The target monitor folder must be inside a Git repository.");
            Console.Error.WriteLine($"Folder: {Path.GetFullPath(options.MonitorFolder!)}");
            return 2;
        }

        if (options.CreateGitHubIssues && !GitHubIssueCreator.IsGhAvailable(repository.Root))
        {
            Console.Error.WriteLine("GitHub issue creation is enabled, but the GitHub CLI command 'gh' could not be run.");
            Console.Error.WriteLine("Install GitHub CLI and run 'gh auth login', or use --no-github for local-only Todo normalisation.");
            return 3;
        }

        Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(options.TodoMarkdownFile!)) ?? ".");
        if (!File.Exists(options.TodoMarkdownFile))
        {
            File.WriteAllText(options.TodoMarkdownFile, "# Todos" + Environment.NewLine, Utf8NoBom);
        }

        var issueCreator = new GitHubIssueCreator(options.CreateGitHubIssues, repository);
        var processor = new TodoProcessor(options.TodoMarkdownFile!, repository, issueCreator);
        var debouncer = new DebouncedFileProcessor(TimeSpan.FromMilliseconds(options.DebounceMilliseconds), processor.ProcessFile);

        Console.WriteLine("Todo monitor");
        Console.WriteLine($"Folder:     {Path.GetFullPath(options.MonitorFolder!)}");
        Console.WriteLine($"Git root:   {repository.Root}");
        Console.WriteLine($"Git branch: {repository.Branch}");
        Console.WriteLine($"Git web:    {repository.WebUrl}");
        Console.WriteLine($"Markdown:   {Path.GetFullPath(options.TodoMarkdownFile!)}");
        Console.WriteLine($"Recursive:  {options.Recursive}");
        Console.WriteLine($"GitHub:     {(options.CreateGitHubIssues ? "Enabled" : "Disabled")}");
        Console.WriteLine();

        foreach (var file in EnumerateSourceFiles(options.MonitorFolder!, options.Recursive))
        {
            debouncer.Queue(file);
        }

        if (options.Once)
        {
            debouncer.FlushAll();
            return 0;
        }

        using var watcher = new FileSystemWatcher(options.MonitorFolder!)
        {
            IncludeSubdirectories = options.Recursive,
            NotifyFilter = NotifyFilters.FileName |
                           NotifyFilters.LastWrite |
                           NotifyFilters.Size |
                           NotifyFilters.CreationTime
        };

        watcher.Created += (_, e) => debouncer.Queue(e.FullPath);
        watcher.Changed += (_, e) => debouncer.Queue(e.FullPath);
        watcher.Renamed += (_, e) => debouncer.Queue(e.FullPath);

        watcher.EnableRaisingEvents = true;

        using var stop = new ManualResetEventSlim(false);
        Console.CancelKeyPress += (_, e) =>
        {
            e.Cancel = true;
            stop.Set();
        };

        Console.WriteLine("Watching .js and .cs files. Press Ctrl+C to stop.");
        stop.Wait();

        return 0;
    }

    private static IEnumerable<string> EnumerateSourceFiles(string folder, bool recursive)
    {
        var option = recursive ? SearchOption.AllDirectories : SearchOption.TopDirectoryOnly;

        foreach (var file in Directory.EnumerateFiles(folder, "*.js", option))
        {
            yield return file;
        }

        foreach (var file in Directory.EnumerateFiles(folder, "*.cs", option))
        {
            yield return file;
        }
    }
}

internal sealed class CommandLineOptions
{
    public string? MonitorFolder { get; private init; }
    public string? TodoMarkdownFile { get; private init; }
    public bool Recursive { get; private init; } = true;
    public bool Once { get; private init; }
    public bool CreateGitHubIssues { get; private init; } = true;
    public int DebounceMilliseconds { get; private init; } = 750;

    public bool IsValid =>
        !string.IsNullOrWhiteSpace(MonitorFolder) &&
        Directory.Exists(MonitorFolder) &&
        !string.IsNullOrWhiteSpace(TodoMarkdownFile);

    public static string Usage =>
        """
        Usage:
          dotnet run -- <monitor-folder> <todo-markdown-file>
          dotnet run -- --folder <monitor-folder> --todo <todo-markdown-file> [--once] [--non-recursive] [--debounce 750] [--no-github]

        Watches:
          - .js files
          - .cs files

        Requirements:
          - The monitor folder must be inside a Git repository.
          - GitHub issue creation is enabled by default.
          - For GitHub issue creation, install GitHub CLI and authenticate with: gh auth login
          - Use --no-github to only normalise source Todos and update the markdown file.

        Examples:
          dotnet run -- "C:\Projects\MyProject" "C:\Projects\MyProject\Todos.md"
          dotnet run -- --folder ./src --todo ./Todos.md --once
          dotnet run -- --folder ./src --todo ./Todos.md --once --no-github
        """;

    public static CommandLineOptions Parse(string[] args)
    {
        string? folder = null;
        string? todo = null;
        var recursive = true;
        var once = false;
        var createGitHubIssues = true;
        var debounce = 750;
        var positional = new List<string>();

        for (var i = 0; i < args.Length; i++)
        {
            var arg = args[i];

            switch (arg)
            {
                case "--folder":
                case "-f":
                    folder = ReadNext(args, ref i, arg);
                    break;

                case "--todo":
                case "-t":
                    todo = ReadNext(args, ref i, arg);
                    break;

                case "--debounce":
                case "-d":
                    var value = ReadNext(args, ref i, arg);
                    if (int.TryParse(value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsed) && parsed > 0)
                    {
                        debounce = parsed;
                    }
                    break;

                case "--non-recursive":
                    recursive = false;
                    break;

                case "--once":
                    once = true;
                    break;

                case "--github":
                    createGitHubIssues = true;
                    break;

                case "--no-github":
                    createGitHubIssues = false;
                    break;

                case "--help":
                case "-h":
                case "/?":
                    return new CommandLineOptions();

                default:
                    positional.Add(arg);
                    break;
            }
        }

        folder ??= positional.Count > 0 ? positional[0] : null;
        todo ??= positional.Count > 1 ? positional[1] : null;

        return new CommandLineOptions
        {
            MonitorFolder = folder,
            TodoMarkdownFile = todo,
            Recursive = recursive,
            Once = once,
            CreateGitHubIssues = createGitHubIssues,
            DebounceMilliseconds = debounce
        };
    }

    private static string? ReadNext(string[] args, ref int index, string argumentName)
    {
        if (index + 1 >= args.Length)
        {
            Console.Error.WriteLine($"Missing value for {argumentName}.");
            return null;
        }

        index++;
        return args[index];
    }
}

internal sealed class DebouncedFileProcessor : IDisposable
{
    private readonly ConcurrentDictionary<string, Timer> _timers;
    private readonly TimeSpan _delay;
    private readonly Action<string> _process;

    public DebouncedFileProcessor(TimeSpan delay, Action<string> process)
    {
        _timers = new ConcurrentDictionary<string, Timer>(StringComparer.OrdinalIgnoreCase);
        _delay = delay;
        _process = process;
    }

    public void Queue(string path)
    {
        if (!IsSupportedSourceFile(path))
        {
            return;
        }

        _timers.AddOrUpdate(
            path,
            static (key, state) => new Timer(state.OnTimer, key, state._delay, Timeout.InfiniteTimeSpan),
            static (key, existing, state) =>
            {
                existing.Change(state._delay, Timeout.InfiniteTimeSpan);
                return existing;
            },
            this);
    }

    public void FlushAll()
    {
        foreach (var path in _timers.Keys.ToArray())
        {
            if (_timers.TryRemove(path, out var timer))
            {
                timer.Dispose();
                ProcessSafely(path);
            }
        }
    }

    private static bool IsSupportedSourceFile(string path) =>
        path.EndsWith(".js", StringComparison.OrdinalIgnoreCase) ||
        path.EndsWith(".cs", StringComparison.OrdinalIgnoreCase);

    private void OnTimer(object? state)
    {
        var path = (string)state!;

        if (_timers.TryRemove(path, out var timer))
        {
            timer.Dispose();
        }

        ProcessSafely(path);
    }

    private void ProcessSafely(string path)
    {
        try
        {
            _process(path);
        }
        catch (Exception exception)
        {
            Console.Error.WriteLine($"Failed to process {path}: {exception.Message}");
        }
    }

    public void Dispose()
    {
        foreach (var timer in _timers.Values)
        {
            timer.Dispose();
        }

        _timers.Clear();
    }
}

internal sealed class TodoProcessor
{
    private static readonly Regex FieldRegex = new(
        @"^(?<name>[A-Za-z]+)\s*:\s*(?<value>.*)$",
        RegexOptions.Compiled | RegexOptions.CultureInvariant);

    private static readonly Regex AnyLevelThreeHeaderRegex = new(
        @"(?m)^###\s+[^\r\n]*\r?$",
        RegexOptions.Compiled | RegexOptions.CultureInvariant);

    private static readonly Encoding Utf8NoBom = new UTF8Encoding(encoderShouldEmitUTF8Identifier: false);

    private readonly string _todoMarkdownFile;
    private readonly GitRepository _repository;
    private readonly GitHubIssueCreator _issueCreator;
    private readonly object _markdownLock;
    private readonly ConcurrentDictionary<string, object> _fileLocks;

    public TodoProcessor(string todoMarkdownFile, GitRepository repository, GitHubIssueCreator issueCreator)
    {
        _todoMarkdownFile = Path.GetFullPath(todoMarkdownFile);
        _repository = repository;
        _issueCreator = issueCreator;
        _markdownLock = new object();
        _fileLocks = new ConcurrentDictionary<string, object>(StringComparer.OrdinalIgnoreCase);
    }

    public void ProcessFile(string path)
    {
        if (!File.Exists(path))
        {
            return;
        }

        var gate = _fileLocks.GetOrAdd(path, static _ => new object());

        lock (gate)
        {
            ProcessFileCore(Path.GetFullPath(path));
        }
    }

    private void ProcessFileCore(string path)
    {
        var original = TryReadAllText(path);
        if (original is null)
        {
            Console.Error.WriteLine($"Could not read: {path}");
            return;
        }

        var newLine = DetectNewLine(original);
        var comments = SourceCommentScanner.FindComments(original);
        var replacements = new List<TextReplacement>();
        var fullItemsAlreadyInSource = new List<TodoItem>();
        var newItems = new List<TodoItem>();
        var now = DateTime.Now;

        foreach (var comment in comments)
        {
            if (!TryParseTodo(original, comment, now, out var parsed))
            {
                continue;
            }

            var lineNumber = CountLineNumber(original, comment.Start);
            var repoRelativeSourceFile = ToRepositoryRelativePath(path);
            var markdownRelativeSourceFile = ToMarkdownRelativePath(path);

            if (parsed.HasFullFormat)
            {
                var existing = parsed.Item with
                {
                    File = repoRelativeSourceFile,
                    MarkdownFileLink = markdownRelativeSourceFile,
                    Line = lineNumber
                };

                fullItemsAlreadyInSource.Add(existing);
                continue;
            }

            var item = parsed.Item with
            {
                Id = string.IsNullOrWhiteSpace(parsed.Item.Id)
                    ? Guid.NewGuid().ToString("D")
                    : parsed.Item.Id,
                CreatedAt = parsed.Item.CreatedAt,
                File = repoRelativeSourceFile,
                MarkdownFileLink = markdownRelativeSourceFile,
                Line = lineNumber,
                Completed = parsed.Item.Status.Equals("Closed", StringComparison.OrdinalIgnoreCase) &&
                            string.IsNullOrWhiteSpace(parsed.Item.Completed)
                    ? now.ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture)
                    : parsed.Item.Completed
            };

            if (_issueCreator.Enabled &&
                string.IsNullOrWhiteSpace(item.GitUrl) &&
                item.Status.Equals("Open", StringComparison.OrdinalIgnoreCase))
            {
                if (_issueCreator.TryCreateIssue(item, out var gitUrl))
                {
                    item = item with { GitUrl = gitUrl };
                    Console.WriteLine($"Created GitHub issue: {gitUrl}");
                }
                else
                {
                    Console.Error.WriteLine($"GitHub issue was not created for Todo Id {{{item.Id}}}. GitUrl will be left empty.");
                }
            }

            var indent = GetIndentationAt(original, comment.Start);
            var replacementText = FormatFullComment(item, indent, newLine);

            replacements.Add(new TextReplacement(comment.Start, comment.Length, replacementText));
            newItems.Add(item);
        }

        var shouldAppendNewItems = false;

        if (replacements.Count > 0)
        {
            var updated = ApplyReplacements(original, replacements);

            if (!string.Equals(updated, original, StringComparison.Ordinal))
            {
                if (!TryWriteAllText(path, updated))
                {
                    Console.Error.WriteLine($"Could not write: {path}");
                    return;
                }

                Console.WriteLine($"Updated {replacements.Count} todo(s): {path}");
            }

            shouldAppendNewItems = true;
        }

        var markdownItems = new List<TodoItem>();
        markdownItems.AddRange(fullItemsAlreadyInSource);

        if (shouldAppendNewItems)
        {
            markdownItems.AddRange(newItems);
        }

        if (markdownItems.Count > 0)
        {
            AppendMissingTodosToMarkdown(markdownItems);
        }
    }

    private static bool TryParseTodo(
        string source,
        SourceComment comment,
        DateTime fallbackDateTime,
        out ParsedTodo parsed)
    {
        parsed = default;

        var raw = source.Substring(comment.Start, comment.Length);
        var lines = ExtractCommentLines(raw, comment.Kind);
        var fields = ExtractFields(lines);

        if (!fields.TryGetValue("Todo", out var todo) || string.IsNullOrWhiteSpace(todo))
        {
            return false;
        }

        var group = fields.TryGetValue("Group", out var groupValue) && !string.IsNullOrWhiteSpace(groupValue)
            ? groupValue
            : "General";

        var label = fields.TryGetValue("Label", out var labelValue) && !string.IsNullOrWhiteSpace(labelValue)
            ? labelValue
            : "General";

        var description = fields.TryGetValue("Description", out var descriptionValue)
            ? descriptionValue
            : string.Empty;

        var status = fields.TryGetValue("Status", out var statusValue) &&
                     statusValue.Equals("Closed", StringComparison.OrdinalIgnoreCase)
            ? "Closed"
            : "Open";

        var completed = fields.TryGetValue("Completed", out var completedValue)
            ? completedValue
            : string.Empty;

        var gitUrl = fields.TryGetValue("GitUrl", out var gitUrlValue)
            ? gitUrlValue
            : string.Empty;

        var sourceFile = fields.TryGetValue("File", out var fileValue)
            ? fileValue
            : string.Empty;

        var line = fields.TryGetValue("Line", out var lineValue) &&
                   int.TryParse(lineValue, NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsedLine)
            ? parsedLine
            : 0;

        var idText = fields.TryGetValue("Id", out var idValue)
            ? idValue.Trim().Trim('{', '}')
            : string.Empty;

        var hasValidId = Guid.TryParse(idText, out var guid);
        var createdAt = TryReadCreatedAt(fields, fallbackDateTime);

        var item = new TodoItem(
            Todo: todo,
            Group: group,
            Label: label,
            Description: description,
            File: sourceFile,
            MarkdownFileLink: sourceFile,
            Line: line,
            Id: hasValidId ? guid.ToString("D") : string.Empty,
            CreatedAt: createdAt,
            Status: status,
            Completed: completed,
            GitUrl: gitUrl);

        var hasFullFormat =
            fields.ContainsKey("Todo") &&
            fields.ContainsKey("Group") &&
            fields.ContainsKey("Label") &&
            fields.ContainsKey("Description") &&
            fields.ContainsKey("File") &&
            fields.ContainsKey("Line") &&
            fields.ContainsKey("Id") &&
            fields.ContainsKey("Date") &&
            fields.ContainsKey("Time") &&
            fields.ContainsKey("Status") &&
            fields.ContainsKey("Completed") &&
            fields.ContainsKey("GitUrl") &&
            hasValidId;

        parsed = new ParsedTodo(item, hasFullFormat);
        return true;
    }

    private static Dictionary<string, string> ExtractFields(List<string> lines)
    {
        var fields = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        string? currentFieldName = null;

        foreach (var line in lines)
        {
            var match = FieldRegex.Match(line);
            if (match.Success)
            {
                var name = match.Groups["name"].Value.Trim();
                var value = match.Groups["value"].Value.Trim();

                fields[name] = value;
                currentFieldName = name.Equals("Description", StringComparison.OrdinalIgnoreCase)
                    ? name
                    : null;

                continue;
            }

            if (currentFieldName is not null &&
                fields.TryGetValue(currentFieldName, out var existing))
            {
                fields[currentFieldName] = existing + Environment.NewLine + line.Trim();
            }
        }

        return fields;
    }

    private static DateTime TryReadCreatedAt(Dictionary<string, string> fields, DateTime fallback)
    {
        if (!fields.TryGetValue("Date", out var date) ||
            !fields.TryGetValue("Time", out var time))
        {
            return fallback;
        }

        return DateTime.TryParseExact(
            $"{date} {time}",
            "yyyy-MM-dd HH:mm:ss",
            CultureInfo.InvariantCulture,
            DateTimeStyles.None,
            out var parsed)
                ? parsed
                : fallback;
    }

    private static List<string> ExtractCommentLines(string raw, CommentKind kind)
    {
        if (kind == CommentKind.Line)
        {
            var line = raw.StartsWith("//", StringComparison.Ordinal)
                ? raw[2..]
                : raw;

            return new List<string> { line.Trim() };
        }

        var content = raw;

        if (content.StartsWith("/**", StringComparison.Ordinal))
        {
            content = content[3..];
        }
        else if (content.StartsWith("/*", StringComparison.Ordinal))
        {
            content = content[2..];
        }

        if (content.EndsWith("*/", StringComparison.Ordinal))
        {
            content = content[..^2];
        }

        var lines = content
            .Replace("\r\n", "\n")
            .Replace('\r', '\n')
            .Split('\n');

        var result = new List<string>();

        foreach (var line in lines)
        {
            var value = line.Trim();

            if (value.StartsWith("*", StringComparison.Ordinal))
            {
                value = value[1..].TrimStart();
            }

            if (!string.IsNullOrWhiteSpace(value))
            {
                result.Add(value.Trim());
            }
        }

        return result;
    }

    private static string FormatFullComment(TodoItem item, string indent, string newLine)
    {
        var completed = item.Status.Equals("Closed", StringComparison.OrdinalIgnoreCase) &&
                        string.IsNullOrWhiteSpace(item.Completed)
            ? DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture)
            : item.Completed;

        var lines = new List<string>
        {
            $"{indent}/**",
            $"{indent} * Todo: {item.Todo}",
            $"{indent} * Group: {item.Group}",
            $"{indent} * Label: {item.Label}"
        };

        lines.AddRange(FormatCommentField(indent, "Description", item.Description));

        lines.AddRange(
            new[]
            {
                $"{indent} * File: {item.File}",
                $"{indent} * Line: {item.Line}",
                $"{indent} * Id: {{{item.Id}}}",
                $"{indent} * Date: {item.CreatedAt:yyyy-MM-dd}",
                $"{indent} * Time: {item.CreatedAt:HH:mm:ss}",
                $"{indent} * Status: {item.Status}",
                $"{indent} * Completed: {completed}",
                $"{indent} * GitUrl: {item.GitUrl}",
                $"{indent} */"
            });

        return string.Join(newLine, lines);
    }

    private static IEnumerable<string> FormatCommentField(string indent, string name, string value)
    {
        var lines = (value ?? string.Empty)
            .Replace("\r\n", "\n")
            .Replace('\r', '\n')
            .Split('\n');

        yield return $"{indent} * {name}: {lines[0]}";

        for (var i = 1; i < lines.Length; i++)
        {
            yield return $"{indent} *   {lines[i]}";
        }
    }

    private void AppendMissingTodosToMarkdown(IEnumerable<TodoItem> items)
    {
        lock (_markdownLock)
        {
            var markdown = File.Exists(_todoMarkdownFile)
                ? File.ReadAllText(_todoMarkdownFile, Utf8NoBom)
                : "# Todos" + Environment.NewLine;

            var original = markdown;

            foreach (var item in items)
            {
                if (string.IsNullOrWhiteSpace(item.Id))
                {
                    continue;
                }

                var marker = "{" + item.Id + "}";
                if (markdown.Contains(marker, StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                markdown = AppendTodoToGroup(markdown, item);
            }

            if (!string.Equals(markdown, original, StringComparison.Ordinal))
            {
                File.WriteAllText(_todoMarkdownFile, markdown, Utf8NoBom);
            }
        }
    }

    private static string AppendTodoToGroup(string markdown, TodoItem item)
    {
        var newLine = DetectNewLine(markdown);
        var itemLine = FormatMarkdownTodoItem(item);
        var headerRegex = CreateGroupHeaderRegex(item.Group);
        var headerMatch = headerRegex.Match(markdown);

        if (!headerMatch.Success)
        {
            var builder = new StringBuilder(markdown);

            if (builder.Length > 0 && !EndsWithNewLine(builder))
            {
                builder.Append(newLine);
            }

            if (builder.Length > 0 && !EndsWithBlankLine(builder.ToString()))
            {
                builder.Append(newLine);
            }

            builder.Append("### ");
            builder.Append(item.Group);
            builder.Append(newLine);
            builder.Append(newLine);
            builder.Append(itemLine);
            builder.Append(newLine);

            return builder.ToString();
        }

        var searchStart = headerMatch.Index + headerMatch.Length;
        var nextHeaderMatch = AnyLevelThreeHeaderRegex.Match(markdown, searchStart);
        var insertIndex = nextHeaderMatch.Success ? nextHeaderMatch.Index : markdown.Length;

        var before = markdown[..insertIndex].TrimEnd('\r', '\n');
        var after = markdown[insertIndex..].TrimStart('\r', '\n');

        var result = before + newLine + itemLine + newLine;

        if (!string.IsNullOrWhiteSpace(after))
        {
            result += newLine + after;
        }

        return result;
    }

    private static string FormatMarkdownTodoItem(TodoItem item)
    {
        var check = item.Status.Equals("Closed", StringComparison.OrdinalIgnoreCase) ? "x" : " ";
        var source = string.IsNullOrWhiteSpace(item.MarkdownFileLink)
            ? item.File
            : item.MarkdownFileLink;

        var line = $"- [{check}] Todo: {item.Todo} {{{item.Id}}} ({item.CreatedAt:yyyy-MM-dd HH:mm:ss})";

        if (!string.IsNullOrWhiteSpace(source))
        {
            line += $" ([Source]({EscapeMarkdownLink(source)}";
            if (item.Line > 0)
            {
                line += $"#L{item.Line}";
            }

            line += "))";
        }

        if (!string.IsNullOrWhiteSpace(item.GitUrl))
        {
            line += $" ([GitHub Issue]({EscapeMarkdownLink(item.GitUrl)}))";
        }

        return line;
    }

    private static string EscapeMarkdownLink(string value) =>
        value.Replace("\\", "/").Replace(" ", "%20");

    private static Regex CreateGroupHeaderRegex(string group) =>
        new(
            @"(?m)^###\s+" + Regex.Escape(group) + @"[ \t]*\r?$",
            RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);

    private static string ApplyReplacements(string source, List<TextReplacement> replacements)
    {
        var builder = new StringBuilder(source);

        foreach (var replacement in replacements.OrderByDescending(static replacement => replacement.Start))
        {
            builder.Remove(replacement.Start, replacement.Length);
            builder.Insert(replacement.Start, replacement.Text);
        }

        return builder.ToString();
    }

    private static string GetIndentationAt(string source, int index)
    {
        var lineStart = index;

        while (lineStart > 0 && source[lineStart - 1] is not '\r' and not '\n')
        {
            lineStart--;
        }

        var beforeComment = source[lineStart..index];

        return beforeComment.All(static ch => ch is ' ' or '\t')
            ? beforeComment
            : string.Empty;
    }

    private string ToRepositoryRelativePath(string sourceFile)
    {
        var relative = Path.GetRelativePath(_repository.Root, sourceFile);
        return relative.Replace("\\", "/");
    }

    private string ToMarkdownRelativePath(string sourceFile)
    {
        var todoDirectory = Path.GetDirectoryName(_todoMarkdownFile) ?? _repository.Root;
        var relative = Path.GetRelativePath(todoDirectory, sourceFile);
        return relative.Replace("\\", "/");
    }

    private static int CountLineNumber(string source, int index)
    {
        var line = 1;

        for (var i = 0; i < index && i < source.Length; i++)
        {
            if (source[i] == '\n')
            {
                line++;
            }
        }

        return line;
    }

    private static string? TryReadAllText(string path)
    {
        for (var attempt = 0; attempt < 6; attempt++)
        {
            try
            {
                return File.ReadAllText(path, Utf8NoBom);
            }
            catch (IOException)
            {
                Thread.Sleep(100 * (attempt + 1));
            }
            catch (UnauthorizedAccessException)
            {
                Thread.Sleep(100 * (attempt + 1));
            }
        }

        return null;
    }

    private static bool TryWriteAllText(string path, string text)
    {
        for (var attempt = 0; attempt < 6; attempt++)
        {
            try
            {
                File.WriteAllText(path, text, Utf8NoBom);
                return true;
            }
            catch (IOException)
            {
                Thread.Sleep(100 * (attempt + 1));
            }
            catch (UnauthorizedAccessException)
            {
                Thread.Sleep(100 * (attempt + 1));
            }
        }

        return false;
    }

    private static string DetectNewLine(string text) =>
        text.Contains("\r\n", StringComparison.Ordinal) ? "\r\n" : "\n";

    private static bool EndsWithNewLine(StringBuilder builder)
    {
        if (builder.Length == 0)
        {
            return false;
        }

        var last = builder[builder.Length - 1];
        return last is '\r' or '\n';
    }

    private static bool EndsWithBlankLine(string text) =>
        text.EndsWith("\r\n\r\n", StringComparison.Ordinal) ||
        text.EndsWith("\n\n", StringComparison.Ordinal);
}

internal sealed class GitHubIssueCreator
{
    private static readonly Regex UrlRegex = new(
        @"https?://\S+",
        RegexOptions.Compiled | RegexOptions.CultureInvariant);

    private readonly GitRepository _repository;

    public GitHubIssueCreator(bool enabled, GitRepository repository)
    {
        Enabled = enabled;
        _repository = repository;
    }

    public bool Enabled { get; }

    public static bool IsGhAvailable(string workingDirectory)
    {
        var result = ExternalCommand.Run(
            "gh",
            new[] { "--version" },
            workingDirectory,
            TimeSpan.FromSeconds(10));

        return result.ExitCode == 0;
    }

    public bool TryCreateIssue(TodoItem item, out string gitUrl)
    {
        gitUrl = string.Empty;

        if (!Enabled)
        {
            return false;
        }

        var arguments = new List<string>
        {
            "issue",
            "create",
            "--title",
            item.Todo,
            "--body",
            CreateIssueBody(item)
        };

        foreach (var label in SplitLabels(item.Label))
        {
            arguments.Add("--label");
            arguments.Add(label);
        }

        var result = ExternalCommand.Run(
            "gh",
            arguments,
            _repository.Root,
            TimeSpan.FromSeconds(60));

        if (result.ExitCode != 0)
        {
            Console.Error.WriteLine(result.StandardError.Trim());
            return false;
        }

        gitUrl = ExtractUrl(result.StandardOutput);

        if (string.IsNullOrWhiteSpace(gitUrl))
        {
            Console.Error.WriteLine("GitHub CLI completed, but no issue URL was found in the output.");
            return false;
        }

        return true;
    }

    private string CreateIssueBody(TodoItem item)
    {
        var builder = new StringBuilder();

        builder.Append("Id: {");
        builder.Append(item.Id);
        builder.AppendLine("}");
        builder.AppendLine();

        var sourceUrl = _repository.CreateGitHubFileUrl(item.File, item.Line);
        if (!string.IsNullOrWhiteSpace(sourceUrl))
        {
            builder.AppendLine("Source:");
            builder.AppendLine(sourceUrl);
            builder.AppendLine();
        }
        else if (!string.IsNullOrWhiteSpace(item.File))
        {
            builder.AppendLine("Source:");
            builder.Append(item.File);

            if (item.Line > 0)
            {
                builder.Append("#L");
                builder.Append(item.Line.ToString(CultureInfo.InvariantCulture));
            }

            builder.AppendLine();
            builder.AppendLine();
        }

        builder.AppendLine("Description:");
        builder.AppendLine(item.Description ?? string.Empty);

        return builder.ToString();
    }

    private static IEnumerable<string> SplitLabels(string label)
    {
        if (string.IsNullOrWhiteSpace(label))
        {
            yield break;
        }

        foreach (var value in label.Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            if (!string.IsNullOrWhiteSpace(value))
            {
                yield return value;
            }
        }
    }

    private static string ExtractUrl(string output)
    {
        var match = UrlRegex.Match(output);
        return match.Success ? match.Value.Trim() : string.Empty;
    }
}

internal sealed class GitRepository
{
    private GitRepository(string root, string branch, string webUrl)
    {
        Root = root;
        Branch = string.IsNullOrWhiteSpace(branch) ? "main" : branch;
        WebUrl = webUrl;
    }

    public string Root { get; }
    public string Branch { get; }
    public string WebUrl { get; }

    public static bool TryCreate(string folder, out GitRepository repository)
    {
        repository = default!;
        var fullFolder = Path.GetFullPath(folder);

        if (!TryFindRepositoryRoot(fullFolder, out var root))
        {
            return false;
        }

        var branch = GetCurrentBranch(root);
        var remoteUrl = GetRemoteUrl(root);
        var webUrl = ConvertRemoteToGitHubWebUrl(remoteUrl);

        repository = new GitRepository(root, branch, webUrl);
        return true;
    }

    public string CreateGitHubFileUrl(string repositoryRelativePath, int line)
    {
        if (string.IsNullOrWhiteSpace(WebUrl) ||
            string.IsNullOrWhiteSpace(repositoryRelativePath))
        {
            return string.Empty;
        }

        var path = repositoryRelativePath.Replace("\\", "/").TrimStart('/');
        var url = $"{WebUrl}/blob/{Uri.EscapeDataString(Branch).Replace("%2F", "/")}/{EscapeGitHubPath(path)}";

        if (line > 0)
        {
            url += $"#L{line.ToString(CultureInfo.InvariantCulture)}";
        }

        return url;
    }

    private static bool TryFindRepositoryRoot(string folder, out string repositoryRoot)
    {
        repositoryRoot = string.Empty;

        var gitResult = ExternalCommand.Run(
            "git",
            new[] { "-C", folder, "rev-parse", "--show-toplevel" },
            folder,
            TimeSpan.FromSeconds(10));

        if (gitResult.ExitCode == 0)
        {
            var path = gitResult.StandardOutput.Trim();

            if (!string.IsNullOrWhiteSpace(path) && Directory.Exists(path))
            {
                repositoryRoot = Path.GetFullPath(path);
                return true;
            }
        }

        return TryFindRepositoryRootByWalking(folder, out repositoryRoot);
    }

    private static bool TryFindRepositoryRootByWalking(string folder, out string repositoryRoot)
    {
        repositoryRoot = string.Empty;

        var directory = new DirectoryInfo(folder);
        while (directory is not null)
        {
            var gitDirectory = Path.Combine(directory.FullName, ".git");
            if (Directory.Exists(gitDirectory) || File.Exists(gitDirectory))
            {
                repositoryRoot = directory.FullName;
                return true;
            }

            directory = directory.Parent;
        }

        return false;
    }

    private static string GetCurrentBranch(string root)
    {
        var result = ExternalCommand.Run(
            "git",
            new[] { "-C", root, "branch", "--show-current" },
            root,
            TimeSpan.FromSeconds(10));

        if (result.ExitCode == 0 && !string.IsNullOrWhiteSpace(result.StandardOutput))
        {
            return result.StandardOutput.Trim();
        }

        return "main";
    }

    private static string GetRemoteUrl(string root)
    {
        var result = ExternalCommand.Run(
            "git",
            new[] { "-C", root, "remote", "get-url", "origin" },
            root,
            TimeSpan.FromSeconds(10));

        if (result.ExitCode == 0)
        {
            return result.StandardOutput.Trim();
        }

        return string.Empty;
    }

    private static string ConvertRemoteToGitHubWebUrl(string remoteUrl)
    {
        if (string.IsNullOrWhiteSpace(remoteUrl))
        {
            return string.Empty;
        }

        var trimmed = remoteUrl.Trim();

        if (trimmed.StartsWith("git@github.com:", StringComparison.OrdinalIgnoreCase))
        {
            var path = trimmed["git@github.com:".Length..];
            return "https://github.com/" + RemoveGitSuffix(path);
        }

        if (trimmed.StartsWith("ssh://git@github.com/", StringComparison.OrdinalIgnoreCase))
        {
            var path = trimmed["ssh://git@github.com/".Length..];
            return "https://github.com/" + RemoveGitSuffix(path);
        }

        if (trimmed.StartsWith("https://github.com/", StringComparison.OrdinalIgnoreCase) ||
            trimmed.StartsWith("http://github.com/", StringComparison.OrdinalIgnoreCase))
        {
            return RemoveGitSuffix(trimmed).Replace("http://", "https://", StringComparison.OrdinalIgnoreCase);
        }

        return string.Empty;
    }

    private static string RemoveGitSuffix(string value) =>
        value.EndsWith(".git", StringComparison.OrdinalIgnoreCase)
            ? value[..^4]
            : value;

    private static string EscapeGitHubPath(string path) =>
        string.Join(
            "/",
            path.Split('/', StringSplitOptions.RemoveEmptyEntries)
                .Select(static part => Uri.EscapeDataString(part)));
}

internal static class ExternalCommand
{
    public static CommandResult Run(
        string fileName,
        IEnumerable<string> arguments,
        string workingDirectory,
        TimeSpan timeout)
    {
        try
        {
            using var process = new Process();

            process.StartInfo = new ProcessStartInfo
            {
                FileName = fileName,
                WorkingDirectory = workingDirectory,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            foreach (var argument in arguments)
            {
                process.StartInfo.ArgumentList.Add(argument);
            }

            if (!process.Start())
            {
                return new CommandResult(-1, string.Empty, $"Could not start process: {fileName}");
            }

            var standardOutputTask = process.StandardOutput.ReadToEndAsync();
            var standardErrorTask = process.StandardError.ReadToEndAsync();

            if (!process.WaitForExit((int)timeout.TotalMilliseconds))
            {
                TryKill(process);
                return new CommandResult(-1, string.Empty, $"Command timed out: {fileName}");
            }

            Task.WaitAll(standardOutputTask, standardErrorTask);

            return new CommandResult(
                process.ExitCode,
                standardOutputTask.Result,
                standardErrorTask.Result);
        }
        catch (Exception exception) when (
            exception is InvalidOperationException ||
            exception is System.ComponentModel.Win32Exception ||
            exception is IOException ||
            exception is UnauthorizedAccessException)
        {
            return new CommandResult(-1, string.Empty, exception.Message);
        }
    }

    private static void TryKill(Process process)
    {
        try
        {
            if (!process.HasExited)
            {
                process.Kill(entireProcessTree: true);
            }
        }
        catch
        {
            // Best effort cleanup only.
        }
    }
}

internal static class SourceCommentScanner
{
    public static List<SourceComment> FindComments(string source)
    {
        var comments = new List<SourceComment>();
        var inSingleQuote = false;
        var inDoubleQuote = false;
        var inTemplateLiteral = false;
        var escaped = false;

        for (var index = 0; index < source.Length; index++)
        {
            var current = source[index];

            if (inSingleQuote)
            {
                UpdateQuotedState(current, '\'', ref inSingleQuote, ref escaped);
                continue;
            }

            if (inDoubleQuote)
            {
                UpdateQuotedState(current, '"', ref inDoubleQuote, ref escaped);
                continue;
            }

            if (inTemplateLiteral)
            {
                UpdateQuotedState(current, '`', ref inTemplateLiteral, ref escaped);
                continue;
            }

            if (current == '\'')
            {
                inSingleQuote = true;
                escaped = false;
                continue;
            }

            if (current == '"')
            {
                inDoubleQuote = true;
                escaped = false;
                continue;
            }

            if (current == '`')
            {
                inTemplateLiteral = true;
                escaped = false;
                continue;
            }

            if (current != '/' || index + 1 >= source.Length)
            {
                continue;
            }

            var next = source[index + 1];

            if (next == '/')
            {
                var start = index;
                index += 2;

                while (index < source.Length && source[index] is not '\r' and not '\n')
                {
                    index++;
                }

                comments.Add(new SourceComment(start, index - start, CommentKind.Line));
                index--;
                continue;
            }

            if (next == '*')
            {
                var start = index;
                index += 2;

                while (index + 1 < source.Length && !(source[index] == '*' && source[index + 1] == '/'))
                {
                    index++;
                }

                if (index + 1 < source.Length)
                {
                    index += 2;
                }
                else
                {
                    index = source.Length;
                }

                comments.Add(new SourceComment(start, index - start, CommentKind.Block));
                index--;
            }
        }

        return comments;
    }

    private static void UpdateQuotedState(char current, char quote, ref bool inQuote, ref bool escaped)
    {
        if (escaped)
        {
            escaped = false;
            return;
        }

        if (current == '\\')
        {
            escaped = true;
            return;
        }

        if (current == quote)
        {
            inQuote = false;
        }
    }
}

internal enum CommentKind
{
    Line,
    Block
}

internal readonly record struct CommandResult(
    int ExitCode,
    string StandardOutput,
    string StandardError);

internal readonly record struct SourceComment(
    int Start,
    int Length,
    CommentKind Kind);

internal readonly record struct TextReplacement(
    int Start,
    int Length,
    string Text);

internal readonly record struct ParsedTodo(
    TodoItem Item,
    bool HasFullFormat);

internal readonly record struct TodoItem(
    string Todo,
    string Group,
    string Label,
    string Description,
    string File,
    string MarkdownFileLink,
    int Line,
    string Id,
    DateTime CreatedAt,
    string Status,
    string Completed,
    string GitUrl);
