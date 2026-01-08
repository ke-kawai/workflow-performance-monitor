import fs from "fs";
import si from "systeminformation";

// Mock modules before importing the class
jest.mock("fs");
jest.mock("systeminformation");
jest.mock("../../../utils/logger", () => ({
  Logger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    isDebugEnabled: jest.fn().mockReturnValue(false),
  })),
}));

describe("ProcessBackgroundTracer", () => {
  let writeFileSyncMock: jest.SpyInstance;
  let processesMock: jest.MockedFunction<typeof si.processes>;

  beforeAll(() => {
    jest.useFakeTimers();
    writeFileSyncMock = jest.spyOn(fs, "writeFileSync").mockImplementation();
    processesMock = si.processes as jest.MockedFunction<typeof si.processes>;

    // Setup default mock for processes
    processesMock.mockResolvedValue({
      all: 0,
      running: 0,
      blocked: 0,
      sleeping: 0,
      unknown: 0,
      list: [
        {
          pid: 1234,
          parentPid: 1,
          name: "test-process",
          pcpu: 10.5,
          pcpuu: 0,
          pcpus: 0,
          pmem: 2.3,
          priority: 0,
          mem_vsz: 0,
          mem_rss: 0,
          nice: 0,
          started: new Date().toISOString(),
          state: "running",
          tty: "",
          user: "test",
          command: "test",
          params: "",
          path: "",
          cpu: 10.5,
          mem: 2.3,
        } as any,
      ],
    } as any);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it("should initialize and start collecting processes", async () => {
    // Import after mocking to trigger initialization
    await import("../processTracerWorker");

    // Wait for initial collection
    await jest.runOnlyPendingTimersAsync();

    // Verify that process collection was called
    expect(processesMock).toHaveBeenCalled();

    // Verify that data was saved to file
    expect(writeFileSyncMock).toHaveBeenCalled();

    // Verify file path
    const lastCall = writeFileSyncMock.mock.calls[writeFileSyncMock.mock.calls.length - 1];
    expect(lastCall[0]).toContain("proc-tracer-data.json");

    // Verify JSON format
    expect(() => JSON.parse(lastCall[1] as string)).not.toThrow();

    // Verify data structure
    const savedData = JSON.parse(lastCall[1] as string);
    expect(savedData).toHaveProperty("completed");
    expect(savedData).toHaveProperty("tracked");
    expect(Array.isArray(savedData.completed)).toBe(true);
    expect(Array.isArray(savedData.tracked)).toBe(true);
  });
});
