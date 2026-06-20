using System.Collections.Concurrent;
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

        Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(options.TodoMarkdownFile!)) ?? ".");
        if (!File.Exists(options.TodoMarkdownFile))
        {
            File.WriteAllText(options.TodoMarkdownFile, "# Todos" + Environment.NewLine, Utf8NoBom);
        }

        var processor = new TodoProcessor(options.TodoMarkdownFile!);
        var debouncer = new DebouncedFileProcessor(TimeSpan.FromMilliseconds(options.DebounceMilliseconds), processor.ProcessFile);

        Console.WriteLine("Todo monitor");
        Console.WriteLine($"Folder:    {Path.GetFullPath(options.MonitorFolder!)}");
        Console.WriteLine($"Markdown:  {Path.GetFullPath(options.TodoMarkdownFile!)}");
        Console.WriteLine($"Recursive: {options.Recursive}");
        Console.WriteLine();

        foreach (var file in Directory.EnumerateFiles(
            options.MonitorFolder!,
            "*.js",
            options.Recursive ? SearchOption.AllDirectories : SearchOption.TopDirectoryOnly))
        {
            debouncer.Queue(file);
        }

        if (options.Once)
        {
            debouncer.FlushAll();
            return 0;
        }

        using var watcher = new FileSystemWatcher(options.MonitorFolder!, "*.js")
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

        Console.WriteLine("Watching. Press Ctrl+C to stop.");
        stop.Wait();

        return 0;
    }
}

internal sealed class CommandLineOptions
{
    public string? MonitorFolder { get; private init; }
    public string? TodoMarkdownFile { get; private init; }
    public bool Recursive { get; private init; } = true;
    public bool Once { get; private init; }
    public int DebounceMilliseconds { get; private init; } = 750;

    public bool IsValid =>
        !string.IsNullOrWhiteSpace(MonitorFolder) &&
        Directory.Exists(MonitorFolder) &&
        !string.IsNullOrWhiteSpace(TodoMarkdownFile);

    public static string Usage =>
        """
        Usage:
          dotnet run -- <monitor-folder> <todo-markdown-file>
          dotnet run -- --folder <monitor-folder> --todo <todo-markdown-file> [--once] [--non-recursive] [--debounce 750]

        Examples:
          dotnet run -- "C:\Projects\MyExtension" "C:\Projects\MyExtension\Todos.md"
          dotnet run -- --folder ./src --todo ./Todos.md --once
        """;

    public static CommandLineOptions Parse(string[] args)
    {
        string? folder = null;
        string? todo = null;
        var recursive = true;
        var once = false;
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
        if (!path.EndsWith(".js", StringComparison.OrdinalIgnoreCase))
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
    private readonly object _markdownLock;
    private readonly ConcurrentDictionary<string, object> _fileLocks;

    public TodoProcessor(string todoMarkdownFile)
    {
        _todoMarkdownFile = todoMarkdownFile;
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
            ProcessFileCore(path);
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
        var comments = JavaScriptCommentScanner.FindComments(original);
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

            if (parsed.HasFullFormat)
            {
                fullItemsAlreadyInSource.Add(parsed.Item);
                continue;
            }

            var item = parsed.Item with
            {
                Id = Guid.NewGuid().ToString("D"),
                CreatedAt = now,
                Completed = parsed.Item.Status.Equals("Closed", StringComparison.OrdinalIgnoreCase) &&
                            string.IsNullOrWhiteSpace(parsed.Item.Completed)
                    ? now.ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture)
                    : parsed.Item.Completed
            };

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
        JavaScriptComment comment,
        DateTime fallbackDateTime,
        out ParsedTodo parsed)
    {
        parsed = default;

        var raw = source.Substring(comment.Start, comment.Length);
        var lines = ExtractCommentLines(raw, comment.Kind);
        var fields = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        foreach (var line in lines)
        {
            var match = FieldRegex.Match(line);
            if (!match.Success)
            {
                continue;
            }

            var name = match.Groups["name"].Value.Trim();
            var value = match.Groups["value"].Value.Trim();
            fields[name] = value;
        }

        if (!fields.TryGetValue("Todo", out var todo) || string.IsNullOrWhiteSpace(todo))
        {
            return false;
        }

        var group = fields.TryGetValue("Group", out var groupValue) && !string.IsNullOrWhiteSpace(groupValue)
            ? groupValue
            : "General";

        var status = fields.TryGetValue("Status", out var statusValue) &&
                     statusValue.Equals("Closed", StringComparison.OrdinalIgnoreCase)
            ? "Closed"
            : "Open";

        var completed = fields.TryGetValue("Completed", out var completedValue)
            ? completedValue
            : string.Empty;

        var idText = fields.TryGetValue("Id", out var idValue)
            ? idValue.Trim().Trim('{', '}')
            : string.Empty;

        var hasValidId = Guid.TryParse(idText, out var guid);
        var createdAt = TryReadCreatedAt(fields, fallbackDateTime);

        var item = new TodoItem(
            Todo: todo,
            Group: group,
            Id: hasValidId ? guid.ToString("D") : string.Empty,
            CreatedAt: createdAt,
            Status: status,
            Completed: completed);

        var hasFullFormat =
            fields.ContainsKey("Todo") &&
            fields.ContainsKey("Group") &&
            fields.ContainsKey("Id") &&
            fields.ContainsKey("Date") &&
            fields.ContainsKey("Time") &&
            fields.ContainsKey("Status") &&
            fields.ContainsKey("Completed") &&
            hasValidId;

        parsed = new ParsedTodo(item, hasFullFormat);
        return true;
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

        return string.Join(
            newLine,
            $"{indent}/**",
            $"{indent} * Todo: {item.Todo}",
            $"{indent} * Group: {item.Group}",
            $"{indent} * Id: {{{item.Id}}}",
            $"{indent} * Date: {item.CreatedAt:yyyy-MM-dd}",
            $"{indent} * Time: {item.CreatedAt:HH:mm:ss}",
            $"{indent} * Status: {item.Status}",
            $"{indent} * Completed: {completed}",
            $"{indent} */");
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
        var line = $"- [{check}] Todo: {item.Todo} {{{item.Id}}} ({item.CreatedAt:yyyy-MM-dd HH:mm:ss})";

        if (item.Status.Equals("Closed", StringComparison.OrdinalIgnoreCase) &&
            !string.IsNullOrWhiteSpace(item.Completed))
        {
            line += $" Completed: {item.Completed}";
        }

        return line;
    }

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

internal static class JavaScriptCommentScanner
{
    public static List<JavaScriptComment> FindComments(string source)
    {
        var comments = new List<JavaScriptComment>();
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

                comments.Add(new JavaScriptComment(start, index - start, CommentKind.Line));
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

                comments.Add(new JavaScriptComment(start, index - start, CommentKind.Block));
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

internal readonly record struct JavaScriptComment(int Start, int Length, CommentKind Kind);

internal readonly record struct TextReplacement(int Start, int Length, string Text);

internal readonly record struct ParsedTodo(TodoItem Item, bool HasFullFormat);

internal readonly record struct TodoItem(
    string Todo,
    string Group,
    string Id,
    DateTime CreatedAt,
    string Status,
    string Completed);
