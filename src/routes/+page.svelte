<script>
  import { onMount, onDestroy } from "svelte";
  import { writable } from "svelte/store";
  import { supportedDevices } from "$lib";

  onMount(async () => {
    console.log(`Build Time: ${(new Date(__BUILD_TIME__)).toLocaleString()}`);
    const existingDevices = await navigator.hid.getDevices();
    await addDevice(existingDevices);
  });

  let status = null;
  let devices = writable(new Set());
  let devicesInfo = writable(new Map());

  const setDeviceInfo = (device, info) => {
    if (info?.batteryLevel > 100) {
      info.batteryLevel = 100;
    }
    devicesInfo.update((map) => {
      map.set(device, info);
      return map;
    });
    if (info?.batteryLevel !== null) {
      document.title = `${info.batteryLevel}% - G3 Battery Status`;
    }
  };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const getBatteryLevel = async (device) => {
    const featureReportIds = device.collections.map(c => {
      if (c.featureReports.length > 0) {
        return c.featureReports[0].reportId;
      }
    }).filter(f => f);
    console.log("Feature report IDs:", featureReportIds);
    for (const reportId of featureReportIds) {
      await sleep(100);
      try {
        const report = await device.receiveFeatureReport(reportId);
        if ($devicesInfo.get(device).handleFeatureReport) {
          $devicesInfo.get(device).handleFeatureReport(device, reportId, report, setDeviceInfo);
        }
      } catch (e) {
        console.error(`Receive feature report[${reportId}] failed:`, e);
      }
    }
  };

  const addDevice = async (device) => {
    for (const d of device) {
      if (d.collections.length > 1) {
        if (!d.opened) {
          await d.open();
        }
        devices.update((devices) => new Set([...devices, d]));

        console.log("Device added:", d);
        const deviceFunctions = supportedDevices.find((sd) => sd.productId === d.productId && sd.vendorId === d.vendorId);
        setDeviceInfo(d, {
          batteryLevel: null,
          handleFeatureReport: deviceFunctions?.handleFeatureReport,
          handleInputReport: deviceFunctions?.handleInputReport,
        });
        d.addEventListener("inputreport", (event) => {
          if ($devicesInfo.get(d).handleInputReport) {
            $devicesInfo.get(d).handleInputReport(d, event.reportId, event.data, setDeviceInfo);
          }
        });
        getBatteryLevel(d);
      }
    }
  };

  const requestDevice = async () => {
    try {
      const device = await navigator.hid.requestDevice({
        filters: supportedDevices.map((d) => ({
          vendorId: d.vendorId,
          productId: d.productId,
        })),
      });
      await addDevice(device);
    } catch (error) {
      console.error("requestDevice error:", error);
      status = "Error: " + error;
    }
  };
</script>

<div class="container">
  <div class="header">
    <h1>G3 Battery Status</h1>
    <button on:click={requestDevice}>Connect to HID Device</button>
    {#if status}
      <div id="status">{status}</div>
    {/if}
  </div>
  <ul class="deviceList">
    {#each $devices as device (device.productId)}
      <li class="device-item">
        <div>
          <strong>Device:</strong>
          <span>{device.productName || "Unknown Device"}</span>
          <br>
          <span class="gray">VendorId: {device.vendorId}, ProductId: {device.productId}</span>
        </div>
        <div class="battery-level">
          {#if $devicesInfo.get(device).batteryLevel}
            <span class="large">{$devicesInfo.get(device).batteryLevel}%</span>
          {:else}
            <span>Loading...</span>
          {/if}
        </div>
      </li>
    {/each}
  </ul>
</div>

<style>
  :global(body) {
    font-family: Arial, sans-serif;
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
    background-color: #f5f5f5;
  }
  .container {
    background-color: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  .container > .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  button {
    background-color: #4caf50;
    color: white;
    padding: 8px 20px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 16px;
  }
  button:hover {
    background-color: #45a049;
  }
  .device-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-left: -40px;
    list-style: none;
    padding: 10px;
    border-bottom: 1px solid #eee;
  }
  .device-item:first-child {
    border-top: 1px solid #eee;
  }
  .device-item .gray {
    color: gray;
  }
  .device-item .large {
    font-size: 1.5em;
  }
</style>
