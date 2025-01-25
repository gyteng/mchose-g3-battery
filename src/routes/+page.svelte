<script>
  import { onMount, onDestroy } from "svelte";
  import { writable } from "svelte/store";

  onMount(async () => {
    const existingDevices = await navigator.hid.getDevices();
    await addDevice(existingDevices);
  });

  let status = null;
  let devices = writable(new Set());
  let devicesInfo = writable(new Map());

  const setDeviceInfo = (device, info) => {
    devicesInfo.update((map) => {
      map.set(device, info);
      return map;
    });
  };

  const getBatteryLevel = async (device) => {
    try {
      const report = await device.receiveFeatureReport(0x09);
      if (report.buffer.byteLength > 9) {
        console.log("Invalid feature report:", report);
        return;
      }
      const data = new Uint8Array(report.buffer);
      let batteryLevel = data[8];
      if (batteryLevel > 100) {
        batteryLevel = 100;
      }
      setDeviceInfo(device, {
        batteryLevel,
      });
    } catch (e) {
      console.log("Receive feature report failed:", e);
    }
  };

  const addDevice = async (device) => {
    for (const d of device) {
      if (d.collections.length > 1) {
        if (!d.opened) {
          await d.open();
        }
        devices.update((devices) => new Set([...devices, d]));

        console.log("Device added:", d.productName);
        setDeviceInfo(d, {
          batteryLevel: null,
        });
        d.addEventListener("inputreport", (event) => {
          const { data } = event;
          console.log("Input report received", data);
          let batteryLevel = data.getUint8(2);
          if (batteryLevel > 100) {
            batteryLevel = 100;
          }
          setDeviceInfo(d, {
            batteryLevel,
          });
        });
        getBatteryLevel(d);
      }
    }

    console.log("devices", devices);
  };

  const requestDevice = async () => {
    try {
      const device = await navigator.hid.requestDevice({
        filters: [
          {
            vendorId: 9610,
            productId: 312,
          },
        ],
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
          {device.productName || "Unknown Device"}
        </div>
        <span class="battery-level">
          {#if $devicesInfo.get(device).batteryLevel}
            <strong>Battery Level:</strong>
            {$devicesInfo.get(device).batteryLevel}%
          {:else}
            <strong>Battery Level:</strong>
            Loading...
          {/if}
        </span>
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
    padding: 10px 20px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 16px;
  }
</style>
