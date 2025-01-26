const supportedDevices = [
  {
    alias: "G3",
    vendorId: 9610,
    productId: 312,
    handleFeatureReport(device, reportId, data, setDeviceInfo) {
      if (reportId !== 0x09) return;
      if (data.buffer.byteLength > 9) {
        return;
      }
      const info = new Uint8Array(data.buffer);
      const batteryLevel = info[8];
      setDeviceInfo(device, {
        batteryLevel,
      });
    },
    handleInputReport(device, reportId, data, setDeviceInfo) {
      if (reportId !== 9) return;
      const batteryLevel = data.getUint8(2);
      setDeviceInfo(device, {
        batteryLevel,
      });
    }
  },
  // {
  //   alias: "G75 Pro",
  //   vendorId: 13652,
  //   productId: 64009,
  //   handleFeatureReport(device, reportId, data, setDeviceInfo) {
  //     console.log("handleFeatureReport", reportId, data);
  //     if (reportId !== 0x06) return;
  //     const info = new Uint8Array(data.buffer);
  //     const batteryLevel = info[5];
  //     setDeviceInfo(device, {
  //       batteryLevel,
  //     });
  //   },
  //   handleInputReport(device, reportId, data, setDeviceInfo) {
  //     console.log("handleInputReport", reportId, data);
  //   }
  // },
];

export { supportedDevices };