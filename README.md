# Workflow Performance Monitor

A GitHub Action to track and monitor the

- workflow runs, jobs and steps
- resource metrics
- and process activities
  of your GitHub Action workflow runs.
  If the run is triggered via a Pull Request, it will create a comment on the connected PR with the results
  and/or publishes the results to the job summary.

The action traces the jobs' step executions and shows them in trace chart,

And collects the following metrics:

- CPU Load (user and system) in percentage
- Memory usage (used and free) in MB
- Network I/O (read and write) in MB
- Disk I/O (read and write) in MB

And traces the process executions

as trace chart with the following information:

- Name
- Start time
- Duration (in ms)
- Finish time
- Exit status as success or fail (highlighted as red)

and as trace table with the following information:

- Name
- Id
- Parent id
- User id
- Start time
- Duration (in ms)
- Exit code
- File name
- Arguments

## About This Project

This project is based on [workflow-telemetry-action](https://github.com/catchpoint/workflow-telemetry-action) by Catchpoint. It was forked and improved to address the following issues with the original:

- As of January 2026, the original project is no longer maintained and has stopped working due to the external API service being discontinued
- The binary-based metrics collection had compatibility issues and only worked on specific runners

### Key Differences from Original

- **Replaced binary with Node.js package**: Now uses the [`systeminformation`](https://www.npmjs.com/package/systeminformation) npm package for metrics collection, providing better cross-platform compatibility
- **Updated external API**: Uses [QuickChart.io](https://quickchart.io/) for chart generation
- **Additional improvements**: Dark mode support and other minor enhancements

### Acknowledgments

Special thanks to the original [workflow-telemetry-action](https://github.com/catchpoint/workflow-telemetry-action) project and its contributors for creating the foundation of this tool.

### Example Output

An example output of a simple workflow run will look like this.

![Step Trace Example](/images/step-trace-example.png)

![Metrics Example](/images/metrics-example.png)

![Process Trace Example](/images/proc-trace-example.png)

## Usage

To use the action, add the following step before the steps you want to track.

```yaml
permissions:
  pull-requests: write
jobs:
  performance-monitor:
    runs-on: ubuntu-latest
    steps:
      - name: Monitor Workflow Performance
        uses: ke-kawai/workflow-performance-monitor@v1.0.0
```

## Configuration

| Option                       | Requirement | Description                                                                                                                                                                                      |
| ---------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `metric_frequency`           | Optional    | Metric collection frequency in seconds. Must be a number. Defaults to `5`.                                                                                                                       |
| `proc_trace_min_duration`    | Optional    | Puts minimum limit for process execution duration to be traced. Must be a number. Defaults to `-1` which means process duration filtering is not applied.                                        |
| `proc_trace_chart_show`      | Optional    | Enables showing traced processes in trace chart. Defaults to `true`.                                                                                                                             |
| `proc_trace_chart_max_count` | Optional    | Maximum number of processes to be shown in trace chart (applicable if `proc_trace_chart_show` input is `true`). Must be a number. Defaults to `10`.                                              |
| `proc_trace_table_show`      | Optional    | Enables showing traced processes in trace table. Defaults to `false`.                                                                                                                            |
| `comment_on_pr`              | Optional    | Set to `true` to publish the results as comment to the PR (applicable if workflow run is triggered by PR). Defaults to `true`. <br/> Requires `pull-requests: write` permission                  |
| `job_summary`                | Optional    | Set to `true` to publish the results as part of the [job summary page](https://github.blog/2022-05-09-supercharging-github-actions-with-job-summaries/) of the workflow run. Defaults to `true`. |
