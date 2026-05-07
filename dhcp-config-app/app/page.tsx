"use client"

import { useState, useEffect, type ChangeEvent } from "react"
import {
  Settings,
  Server,
  Trash2,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Save,
  RefreshCw,
  Network,
  Database,
  Wifi,
  HardDrive,
  Layers,
} from "lucide-react"
import "./styles/dhcp.css"

interface StaticMapping {
  mac: string
  ip: string
}

interface ValidationErrors {
  valid: boolean
  errors?: string[]
}

export default function DHCPConfigPage() {
  const [activeSection, setActiveSection] = useState<"apply" | "remove">("apply")

  const [deviceInfo, setDeviceInfo] = useState({
    targetDevice: "192.168.56.2",
    sshUsername: "admin",
    sshPassword: "",
    deviceType: "cisco",
  })

  // Apply DHCP state
  const [applyFormData, setApplyFormData] = useState({
    poolName: "LAN_POOL",
    networkIP: "192.168.10.0",
    subnetMask: "255.255.255.0",
    rangeStartIP: "192.168.10.100",
    rangeEndIP: "192.168.10.200",
    defaultGateway: "192.168.10.1",
    dnsServer: "8.8.8.8",
    leaseTime: "24",
    staticMappings: [{ mac: "", ip: "" } as StaticMapping],
  })

  const [removeFormData, setRemoveFormData] = useState({
    poolName: "LAN_POOL",
  })

  const [activeStep, setActiveStep] = useState(1)
  const [validationErrors, setValidationErrors] = useState<ValidationErrors | null>(null)
  const [validationSuccess, setValidationSuccess] = useState<boolean>(false)
  const [configOutput, setConfigOutput] = useState<string>("")
  const [generationSuccess, setGenerationSuccess] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<{
    validation: boolean
    generation: boolean
    application: boolean
    removal: boolean
  }>({
    validation: false,
    generation: false,
    application: false,
    removal: false,
  })
  const [deploymentResult, setDeploymentResult] = useState<{ success: boolean; message: string } | null>(null)
  const [removalResult, setRemovalResult] = useState<{ success: boolean; message: string } | null>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)

  const handleDeviceInfoChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setDeviceInfo({
      ...deviceInfo,
      [name]: value,
    })

    setDeploymentResult(null)
    setRemovalResult(null)
  }

  const handleApplyFormChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setApplyFormData({
      ...applyFormData,
      [name]: value,
    })

    if (validationSuccess || generationSuccess) {
      setValidationSuccess(false)
      setGenerationSuccess(false)
      setValidationErrors(null)
      setConfigOutput("")
      setDeploymentResult(null)
    }
  }

  const handleRemoveFormChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setRemoveFormData({
      ...removeFormData,
      [name]: value,
    })

    // Reset removal result when form changes
    setRemovalResult(null)
  }

  const handleStaticMappingChange = (index: number, field: string, value: string) => {
    const updatedMappings = [...applyFormData.staticMappings]
    updatedMappings[index] = {
      ...updatedMappings[index],
      [field]: value,
    }
    setApplyFormData({
      ...applyFormData,
      staticMappings: updatedMappings,
    })

    // Reset validation and generation states when form changes
    if (validationSuccess || generationSuccess) {
      setValidationSuccess(false)
      setGenerationSuccess(false)
      setValidationErrors(null)
      setConfigOutput("")
      setDeploymentResult(null)
    }
  }

  const addStaticMapping = () => {
    setApplyFormData({
      ...applyFormData,
      staticMappings: [...applyFormData.staticMappings, { mac: "", ip: "" }],
    })
  }

  const removeStaticMapping = (index: number) => {
    const updatedMappings = [...applyFormData.staticMappings]
    updatedMappings.splice(index, 1)
    setApplyFormData({
      ...applyFormData,
      staticMappings: updatedMappings,
    })
  }

  const validateConfig = async () => {
    setIsLoading({ ...isLoading, validation: true })
    setValidationErrors(null)
    setValidationSuccess(false)

    try {
      const response = await fetch(`http://127.0.0.1:5000/api/validate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pool_name: applyFormData.poolName,
          start_ip: applyFormData.rangeStartIP,
          end_ip: applyFormData.rangeEndIP,
          gateway: applyFormData.defaultGateway,
          dns: applyFormData.dnsServer,
        }),
        credentials: "omit",
      })

      const data = await response.json()
      setValidationErrors(data)

      if (data.valid) {
        setValidationSuccess(true)
        setActiveStep(2)
      }
    } catch (error) {
      console.error("Validation error:", error)
      setValidationErrors({
        valid: false,
        errors: ["Failed to connect to the validation server. Please ensure the backend is running."],
      })
    } finally {
      setIsLoading({ ...isLoading, validation: false })
    }
  }

  const generateConfig = async () => {
    if (!validationSuccess) {
      setValidationErrors({
        valid: false,
        errors: ["Please validate the configuration first."],
      })
      return
    }

    setIsLoading({ ...isLoading, generation: true })
    setGenerationSuccess(false)

    try {
      const response = await fetch(`http://127.0.0.1:5000/api/generate-config`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pool_name: applyFormData.poolName,
          start_ip: applyFormData.rangeStartIP,
          end_ip: applyFormData.rangeEndIP,
          gateway: applyFormData.defaultGateway,
          dns: applyFormData.dnsServer,
          device_type: deviceInfo.deviceType,
          lease_time: Number.parseInt(applyFormData.leaseTime) || 24,
        }),
        credentials: "omit",
      })

      const data = await response.json()

      if (data.success) {
        setConfigOutput(data.config)
        setGenerationSuccess(true)
        setActiveStep(3)
      } else {
        setValidationErrors({
          valid: false,
          errors: ["Failed to generate configuration."],
        })
      }
    } catch (error) {
      console.error("Generation error:", error)
      setValidationErrors({
        valid: false,
        errors: ["Failed to connect to the configuration server. Please ensure the backend is running."],
      })
    } finally {
      setIsLoading({ ...isLoading, generation: false })
    }
  }

  const applyConfig = async () => {
    if (!configOutput) {
      setValidationErrors({
        valid: false,
        errors: ["Please generate a configuration first."],
      })
      return
    }

    setIsLoading({ ...isLoading, application: true })
    setDeploymentResult(null)

    try {
      const response = await fetch(`http://127.0.0.1:5000/api/apply-config`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          device_ip: deviceInfo.targetDevice,
          username: deviceInfo.sshUsername,
          password: deviceInfo.sshPassword,
          config: configOutput,
          device_type: deviceInfo.deviceType,
        }),
        credentials: "omit",
      })

      const data = await response.json()

      if (data.success) {
        setDeploymentResult({
          success: true,
          message: "Configuration successfully applied to the device!",
        })
      } else {
        setDeploymentResult({
          success: false,
          message: `Failed to apply configuration: ${data.error || "Unknown error"}`,
        })
      }
    } catch (error) {
      console.error("Application error:", error)
      setDeploymentResult({
        success: false,
        message: "Failed to connect to the server. Please ensure the backend is running.",
      })
    } finally {
      setIsLoading({ ...isLoading, application: false })
    }
  }

  const confirmRemoveDHCP = () => {
    setShowConfirmation(true)
  }

  const cancelRemoveDHCP = () => {
    setShowConfirmation(false)
  }

  const removeDHCP = async () => {
    setIsLoading({ ...isLoading, removal: true })
    setRemovalResult(null)
    setShowConfirmation(false)

    try {
      const response = await fetch(`http://127.0.0.1:5000/api/remove-dhcp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          device_ip: deviceInfo.targetDevice,
          username: deviceInfo.sshUsername,
          password: deviceInfo.sshPassword,
          pool_name: removeFormData.poolName,
          device_type: deviceInfo.deviceType,
        }),
        credentials: "omit",
      })

      const data = await response.json()

      if (data.success) {
        setRemovalResult({
          success: true,
          message: "DHCP configuration successfully removed from the device!",
        })
      } else {
        setRemovalResult({
          success: false,
          message: `Failed to remove DHCP configuration: ${data.error || "Unknown error"}`,
        })
      }
    } catch (error) {
      console.error("Removal error:", error)
      setRemovalResult({
        success: false,
        message: "Failed to connect to the server. Please ensure the backend is running.",
      })
    } finally {
      setIsLoading({ ...isLoading, removal: false })
    }
  }

  const resetApplyForm = () => {
    setValidationSuccess(false)
    setGenerationSuccess(false)
    setValidationErrors(null)
    setConfigOutput("")
    setDeploymentResult(null)
    setActiveStep(1)
  }

  // Effect to clear notifications after 5 seconds
  useEffect(() => {
    let timer: NodeJS.Timeout

    if (deploymentResult || removalResult) {
      timer = setTimeout(() => {
        if (deploymentResult) setDeploymentResult(null)
        if (removalResult) setRemovalResult(null)
      }, 5000)
    }

    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [deploymentResult, removalResult])

  return (
    <div className="dhcp-dashboard">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>DHCP Manager</h1>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activeSection === "apply" ? "active" : ""}`}
            onClick={() => setActiveSection("apply")}
          >
            <Settings size={20} />
            <span>Apply Configuration</span>
          </button>

          <button
            className={`nav-item ${activeSection === "remove" ? "active" : ""}`}
            onClick={() => setActiveSection("remove")}
          >
            <Trash2 size={20} />
            <span>Remove Configuration</span>
          </button>
        </nav>

        <div className="device-info-sidebar">
          <h3>Device Information</h3>

          <div className="device-info-field">
            <label htmlFor="targetDevice">IP / Hostname</label>
            <input
              type="text"
              id="targetDevice"
              name="targetDevice"
              value={deviceInfo.targetDevice}
              onChange={handleDeviceInfoChange}
              required
            />
          </div>

          <div className="device-info-field">
            <label htmlFor="sshUsername">Username</label>
            <input
              type="text"
              id="sshUsername"
              name="sshUsername"
              value={deviceInfo.sshUsername}
              onChange={handleDeviceInfoChange}
              required
            />
          </div>

          <div className="device-info-field">
            <label htmlFor="sshPassword">Password</label>
            <input
              type="password"
              id="sshPassword"
              name="sshPassword"
              value={deviceInfo.sshPassword}
              onChange={handleDeviceInfoChange}
              required
            />
          </div>

          <div className="device-info-field">
            <label htmlFor="deviceType">Device Type</label>
            <select
              id="deviceType"
              name="deviceType"
              value={deviceInfo.deviceType}
              onChange={handleDeviceInfoChange}
              required
            >
              <option value="cisco">Cisco</option>
              <option value="linux">Linux</option>
            </select>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Notification Area */}
        <div className="notification-area">
          {validationErrors && !validationErrors.valid && (
            <div className="notification error">
              <AlertCircle size={20} />
              <div>
                <h4>Validation Errors</h4>
                <ul>
                  {validationErrors.errors?.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {validationSuccess && !generationSuccess && (
            <div className="notification success">
              <CheckCircle size={20} />
              <div>
                <h4>Validation Successful</h4>
                <p>Your DHCP configuration is valid. You can now generate the configuration.</p>
              </div>
            </div>
          )}

          {generationSuccess && !deploymentResult && (
            <div className="notification success">
              <CheckCircle size={20} />
              <div>
                <h4>Configuration Generated</h4>
                <p>Your DHCP configuration has been generated successfully. You can now apply it to your device.</p>
              </div>
            </div>
          )}

          {deploymentResult && (
            <div className={`notification ${deploymentResult.success ? "success" : "error"}`}>
              {deploymentResult.success ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
              <div>
                <h4>{deploymentResult.success ? "Deployment Success" : "Deployment Failed"}</h4>
                <p>{deploymentResult.message}</p>
              </div>
            </div>
          )}

          {removalResult && (
            <div className={`notification ${removalResult.success ? "success" : "error"}`}>
              {removalResult.success ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
              <div>
                <h4>{removalResult.success ? "DHCP Removal Success" : "DHCP Removal Failed"}</h4>
                <p>{removalResult.message}</p>
              </div>
            </div>
          )}
        </div>

        {/* Apply DHCP Section */}
        {activeSection === "apply" && (
          <div className="section-content">
            <div className="section-header">
              <h2>Apply DHCP Configuration</h2>
              <button className="reset-button" onClick={resetApplyForm}>
                <RefreshCw size={16} />
                Reset
              </button>
            </div>

            <div className="stepper">
              <div className={`step ${activeStep >= 1 ? "active" : ""} ${activeStep > 1 ? "completed" : ""}`}>
                <div className="step-number">1</div>
                <div className="step-content">
                  <h3>Configure DHCP</h3>
                  <p>Set up your DHCP pool and network settings</p>
                </div>
              </div>
              <div className={`step ${activeStep >= 2 ? "active" : ""} ${activeStep > 2 ? "completed" : ""}`}>
                <div className="step-number">2</div>
                <div className="step-content">
                  <h3>Generate Configuration</h3>
                  <p>Generate device-specific configuration</p>
                </div>
              </div>
              <div className={`step ${activeStep >= 3 ? "active" : ""} ${activeStep > 3 ? "completed" : ""}`}>
                <div className="step-number">3</div>
                <div className="step-content">
                  <h3>Apply to Device</h3>
                  <p>Deploy configuration to your device</p>
                </div>
              </div>
            </div>

            <div className="step-content-area">
              {/* Step 1: Configure */}
              {activeStep === 1 && (
                <div className="step-form">
                  <div className="card-grid">
                    <div className="card">
                      <div className="card-header">
                        <Database size={18} />
                        <h3>Pool Configuration</h3>
                      </div>
                      <div className="card-content">
                        <div className="form-group">
                          <label htmlFor="poolName">Pool Name</label>
                          <input
                            type="text"
                            id="poolName"
                            name="poolName"
                            value={applyFormData.poolName}
                            onChange={handleApplyFormChange}
                            required
                          />
                        </div>

                        <div className="form-group">
                          <label htmlFor="networkIP">Network IP</label>
                          <input
                            type="text"
                            id="networkIP"
                            name="networkIP"
                            value={applyFormData.networkIP}
                            onChange={handleApplyFormChange}
                            pattern="^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$"
                            title="Please enter a valid IP address"
                            required
                          />
                        </div>

                        <div className="form-group">
                          <label htmlFor="subnetMask">Subnet Mask</label>
                          <input
                            type="text"
                            id="subnetMask"
                            name="subnetMask"
                            value={applyFormData.subnetMask}
                            onChange={handleApplyFormChange}
                            pattern="^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$"
                            title="Please enter a valid subnet mask"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <div className="card">
                      <div className="card-header">
                        <Network size={18} />
                        <h3>IP Range</h3>
                      </div>
                      <div className="card-content">
                        <div className="form-group">
                          <label htmlFor="rangeStartIP">Range Start IP</label>
                          <input
                            type="text"
                            id="rangeStartIP"
                            name="rangeStartIP"
                            value={applyFormData.rangeStartIP}
                            onChange={handleApplyFormChange}
                            pattern="^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$"
                            title="Please enter a valid IP address"
                            required
                          />
                        </div>

                        <div className="form-group">
                          <label htmlFor="rangeEndIP">Range End IP</label>
                          <input
                            type="text"
                            id="rangeEndIP"
                            name="rangeEndIP"
                            value={applyFormData.rangeEndIP}
                            onChange={handleApplyFormChange}
                            pattern="^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$"
                            title="Please enter a valid IP address"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <div className="card">
                      <div className="card-header">
                        <Wifi size={18} />
                        <h3>Network Settings</h3>
                      </div>
                      <div className="card-content">
                        <div className="form-group">
                          <label htmlFor="defaultGateway">Default Gateway</label>
                          <input
                            type="text"
                            id="defaultGateway"
                            name="defaultGateway"
                            value={applyFormData.defaultGateway}
                            onChange={handleApplyFormChange}
                            pattern="^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$"
                            title="Please enter a valid IP address"
                            required
                          />
                        </div>

                        <div className="form-group">
                          <label htmlFor="dnsServer">DNS Server</label>
                          <input
                            type="text"
                            id="dnsServer"
                            name="dnsServer"
                            value={applyFormData.dnsServer}
                            onChange={handleApplyFormChange}
                            pattern="^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$"
                            title="Please enter a valid IP address"
                          />
                        </div>

                        <div className="form-group">
                          <label htmlFor="leaseTime">Lease Time (hours)</label>
                          <input
                            type="text"
                            id="leaseTime"
                            name="leaseTime"
                            value={applyFormData.leaseTime}
                            onChange={handleApplyFormChange}
                            placeholder="e.g., 24"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <div className="card full-width">
                      <div className="card-header">
                        <HardDrive size={18} />
                        <h3>Static Mappings (optional)</h3>
                      </div>
                      <div className="card-content">
                        {applyFormData.staticMappings.map((mapping, index) => (
                          <div key={index} className="static-mapping">
                            <div className="form-group">
                              <label htmlFor={`mac-${index}`}>MAC Address</label>
                              <input
                                type="text"
                                id={`mac-${index}`}
                                value={mapping.mac}
                                onChange={(e) => handleStaticMappingChange(index, "mac", e.target.value)}
                                placeholder="AA:BB:CC:DD:EE:FF"
                                pattern="^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$"
                                title="Please enter a valid MAC address (format: AA:BB:CC:DD:EE:FF)"
                              />
                            </div>

                            <div className="form-group">
                              <label htmlFor={`ip-${index}`}>IP Address</label>
                              <input
                                type="text"
                                id={`ip-${index}`}
                                value={mapping.ip}
                                onChange={(e) => handleStaticMappingChange(index, "ip", e.target.value)}
                                placeholder="192.168.10.50"
                                pattern="^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$"
                                title="Please enter a valid IP address"
                              />
                            </div>

                            {index > 0 && (
                              <button
                                type="button"
                                className="remove-mapping-btn"
                                onClick={() => removeStaticMapping(index)}
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        ))}

                        <button type="button" className="add-mapping-btn" onClick={addStaticMapping}>
                          Add Static Mapping
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="step-actions">
                    <button className="primary-button" onClick={validateConfig} disabled={isLoading.validation}>
                      {isLoading.validation ? "Validating..." : "Validate & Continue"}
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Generate */}
              {activeStep === 2 && (
                <div className="step-form">
                  <div className="card full-width">
                    <div className="card-header">
                      <Layers size={18} />
                      <h3>Configuration Preview</h3>
                    </div>
                    <div className="card-content">
                      <p className="config-description">
                        Click the button below to generate the configuration for your {deviceInfo.deviceType} device.
                        This will create the necessary commands to set up DHCP with your specified settings.
                      </p>

                      {configOutput && <pre className="config-output">{configOutput}</pre>}

                      <div className="step-actions">
                        <button className="secondary-button" onClick={() => setActiveStep(1)}>
                          Back to Configuration
                        </button>
                        <button className="primary-button" onClick={generateConfig} disabled={isLoading.generation}>
                          {isLoading.generation ? "Generating..." : "Generate Configuration"}
                          {!isLoading.generation && <ChevronRight size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Apply */}
              {activeStep === 3 && (
                <div className="step-form">
                  <div className="card full-width">
                    <div className="card-header">
                      <Server size={18} />
                      <h3>Apply to Device</h3>
                    </div>
                    <div className="card-content">
                      <p className="config-description">
                        Review the generated configuration below. {deviceInfo.targetDevice}.
                      </p>

                      <div className="device-summary">
                        <div className="summary-item">
                          <span className="summary-label">Device:</span>
                          <span className="summary-value">{deviceInfo.targetDevice}</span>
                        </div>
                        <div className="summary-item">
                          <span className="summary-label">Type:</span>
                          <span className="summary-value">{deviceInfo.deviceType}</span>
                        </div>
                        <div className="summary-item">
                          <span className="summary-label">Pool:</span>
                          <span className="summary-value">{applyFormData.poolName}</span>
                        </div>
                        <div className="summary-item">
                          <span className="summary-label">IP Range:</span>
                          <span className="summary-value">
                            {applyFormData.rangeStartIP} - {applyFormData.rangeEndIP}
                          </span>
                        </div>
                      </div>

                      <pre className="config-output">{configOutput}</pre>

                      <div className="step-actions">
                        <button className="secondary-button" onClick={() => setActiveStep(2)}>
                          Back to Generation
                        </button>
                        <button className="primary-button" onClick={applyConfig} disabled={isLoading.application}>
                          {isLoading.application ? "Applying..." : "Apply to Device"}
                          {!isLoading.application && <Save size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Remove DHCP Section */}
        {activeSection === "remove" && (
          <div className="section-content">
            <div className="section-header">
              <h2>Remove DHCP Configuration</h2>
            </div>

            <div className="card full-width">
              <div className="card-header">
                <Trash2 size={18} />
                <h3>Remove DHCP Configuration</h3>
              </div>
              <div className="card-content">
                <p className="config-description">
                  This will remove DHCP configuration from your device. You can specify a pool name to remove a specific
                  DHCP pool, or leave it empty to remove all DHCP pools from the device.
                </p>

                <div className="form-group">
                  <label htmlFor="removePoolName">Pool Name (optional)</label>
                  <input
                    type="text"
                    id="removePoolName"
                    name="poolName"
                    value={removeFormData.poolName}
                    onChange={handleRemoveFormChange}
                    placeholder="Leave empty to remove all DHCP pools"
                  />
                  <span className="form-hint">
                    Specify the DHCP pool name to remove, or leave empty to remove all DHCP pools.
                  </span>
                </div>

                <div className="device-summary">
                  <div className="summary-item">
                    <span className="summary-label">Device:</span>
                    <span className="summary-value">{deviceInfo.targetDevice}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Type:</span>
                    <span className="summary-value">{deviceInfo.deviceType}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Action:</span>
                    <span className="summary-value">
                      {removeFormData.poolName
                        ? `Remove DHCP pool "${removeFormData.poolName}"`
                        : "Remove all DHCP pools"}
                    </span>
                  </div>
                </div>

                <div className="step-actions">
                  <button className="danger-button" onClick={confirmRemoveDHCP} disabled={isLoading.removal}>
                    {isLoading.removal ? "Removing..." : "Remove DHCP Configuration"}
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Confirm DHCP Removal</h3>
            </div>
            <div className="modal-content">
              <p>
                Are you sure you want to remove the DHCP configuration
                {removeFormData.poolName ? ` for pool "${removeFormData.poolName}"` : ""}
                from {deviceInfo.targetDevice}?
              </p>
              <p className="warning-text">
                <AlertCircle size={16} />
                This action cannot be undone.
              </p>
            </div>
            <div className="modal-actions">
              <button className="secondary-button" onClick={cancelRemoveDHCP}>
                Cancel
              </button>
              <button className="danger-button" onClick={removeDHCP}>
                Yes, Remove DHCP
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
