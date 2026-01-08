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

describe("StatsBackgroundCollector", () => {
  let writeFileSyncMock: jest.SpyInstance;
  let currentLoadMock: jest.MockedFunction<typeof si.currentLoad>;
  let memMock: jest.MockedFunction<typeof si.mem>;
  let networkStatsMock: jest.MockedFunction<typeof si.networkStats>;
  let fsStatsMock: jest.MockedFunction<typeof si.fsStats>;
  let fsSizeMock: jest.MockedFunction<typeof si.fsSize>;

  beforeAll(() => {
    jest.useFakeTimers();
    writeFileSyncMock = jest.spyOn(fs, "writeFileSync").mockImplementation();
    currentLoadMock = si.currentLoad as jest.MockedFunction<typeof si.currentLoad>;
    memMock = si.mem as jest.MockedFunction<typeof si.mem>;
    networkStatsMock = si.networkStats as jest.MockedFunction<typeof si.networkStats>;
    fsStatsMock = si.fsStats as jest.MockedFunction<typeof si.fsStats>;
    fsSizeMock = si.fsSize as jest.MockedFunction<typeof si.fsSize>;

    // Setup default mock implementations
    currentLoadMock.mockResolvedValue({
      avgLoad: 0,
      currentLoad: 45.5,
      currentLoadUser: 30.2,
      currentLoadSystem: 15.3,
      currentLoadNice: 0,
      currentLoadIdle: 54.5,
      currentLoadIrq: 0,
      currentLoadSteal: 0,
      currentLoadGuest: 0,
      rawCurrentLoad: 0,
      rawCurrentLoadUser: 0,
      rawCurrentLoadSystem: 0,
      rawCurrentLoadNice: 0,
      rawCurrentLoadIdle: 0,
      rawCurrentLoadIrq: 0,
      rawCurrentLoadSteal: 0,
      rawCurrentLoadGuest: 0,
      cpus: [],
    });

    memMock.mockResolvedValue({
      total: 16 * 1024 * 1024 * 1024, // 16GB
      free: 4 * 1024 * 1024 * 1024,   // 4GB
      used: 12 * 1024 * 1024 * 1024,  // 12GB
      active: 8 * 1024 * 1024 * 1024, // 8GB
      available: 8 * 1024 * 1024 * 1024, // 8GB
      buffers: 0,
      cached: 0,
      slab: 0,
      swaptotal: 0,
      swapused: 0,
      swapfree: 0,
    } as any);

    networkStatsMock.mockResolvedValue([
      {
        iface: "eth0",
        operstate: "up",
        rx_bytes: 1024 * 1024,
        tx_bytes: 512 * 1024,
        rx_sec: 1024 * 1024, // 1MB/s
        tx_sec: 512 * 1024,  // 0.5MB/s
        rx_dropped: 0,
        tx_dropped: 0,
        rx_errors: 0,
        tx_errors: 0,
        ms: 0,
      } as any,
    ]);

    fsStatsMock.mockResolvedValue({
      rx: 0,
      wx: 0,
      tx: 0,
      rx_sec: 2 * 1024 * 1024, // 2MB/s
      wx_sec: 1 * 1024 * 1024, // 1MB/s
      tx_sec: 0,
      ms: 0,
    });

    fsSizeMock.mockResolvedValue([
      {
        fs: "/dev/sda1",
        type: "ext4",
        size: 500 * 1024 * 1024 * 1024, // 500GB
        used: 300 * 1024 * 1024 * 1024, // 300GB
        available: 0,
        use: 60,
        mount: "/",
        rw: true,
      },
    ]);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it("should initialize and start collecting system stats", async () => {
    // Import after mocking to trigger initialization
    await import("../statsCollectorWorker");

    // Wait for initial collection
    await jest.runOnlyPendingTimersAsync();

    // Verify all stat collectors were called
    expect(currentLoadMock).toHaveBeenCalled();
    expect(memMock).toHaveBeenCalled();
    expect(networkStatsMock).toHaveBeenCalled();
    expect(fsStatsMock).toHaveBeenCalled();
    expect(fsSizeMock).toHaveBeenCalled();

    // Verify data was saved
    expect(writeFileSyncMock).toHaveBeenCalled();

    const lastCall = writeFileSyncMock.mock.calls[writeFileSyncMock.mock.calls.length - 1];

    // Verify file path
    expect(lastCall[0]).toContain("stats-data.json");

    // Verify JSON format
    expect(() => JSON.parse(lastCall[1] as string)).not.toThrow();

    // Verify all stats are present in saved data
    const savedData = JSON.parse(lastCall[1] as string);
    expect(savedData).toHaveProperty("cpu");
    expect(savedData).toHaveProperty("memory");
    expect(savedData).toHaveProperty("network");
    expect(savedData).toHaveProperty("disk");
    expect(savedData).toHaveProperty("diskSize");

    // Verify data structure is correct
    expect(Array.isArray(savedData.cpu)).toBe(true);
    expect(Array.isArray(savedData.memory)).toBe(true);
    expect(Array.isArray(savedData.network)).toBe(true);
    expect(Array.isArray(savedData.disk)).toBe(true);
    expect(Array.isArray(savedData.diskSize)).toBe(true);
  });
});
