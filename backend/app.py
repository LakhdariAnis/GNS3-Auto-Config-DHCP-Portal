from flask import Flask, request, jsonify
from flask_cors import CORS  
import paramiko
import re
import ipaddress

app = Flask(__name__)
CORS(app)  

@app.route('/api/validate', methods=['POST', 'OPTIONS'])
def validate_config():
    if request.method == 'OPTIONS':
        return '', 204
        
    data = request.json
    errors = []
    
    if not data.get('pool_name'):
        errors.append("Pool name is required")
    
    try:
        start_ip = ipaddress.ip_address(data.get('start_ip', ''))
        end_ip = ipaddress.ip_address(data.get('end_ip', ''))
        gateway = ipaddress.ip_address(data.get('gateway', ''))
        
        if end_ip <= start_ip:
            errors.append("End IP must be greater than Start IP")
            
            
    except ValueError:
        errors.append("Invalid IP address format")
    
    return jsonify({
        "valid": len(errors) == 0,
        "errors": errors
    })

@app.route('/api/validate-json', methods=['POST', 'OPTIONS'])
def validate_json():
    if request.method == 'OPTIONS':
        return '', 204
        
    try:
        data = request.json
        if not data:
            return jsonify({
                "valid": False,
                "errors": ["No JSON data provided"]
            })
    except Exception as e:
        return jsonify({
            "valid": False,
            "errors": [f"Invalid JSON format: {str(e)}"]
        })
    
    request_type = data.get('request_type', '')
    
    if request_type == 'config':
        return validate_config_json(data)
    elif request_type == 'apply':
        return validate_apply_json(data)
    elif request_type == 'remove':
        return validate_remove_json(data)
    else:
        return jsonify({
            "valid": False,
            "errors": [f"Unknown request type: {request_type}"]
        })

def validate_config_json(data):
    errors = []
    
    required_fields = ["pool_name", "start_ip", "end_ip", "gateway", "dns"]
    for field in required_fields:
        if not data.get(field):
            errors.append(f"{field} is required")
    
    ip_fields = ["start_ip", "end_ip", "gateway", "dns"]
    for field in ip_fields:
        if field in data:
            try:
                ipaddress.ip_address(data.get(field))
            except ValueError:
                errors.append(f"Invalid {field} format")
    
    if "device_type" in data and data["device_type"] not in ["cisco", "linux"]:
        errors.append("device_type must be either 'cisco' or 'linux'")
    
    if "lease_time" in data:
        try:
            lease_time = int(data["lease_time"])
            if lease_time < 1:
                errors.append("lease_time must be at least 1")
        except ValueError:
            errors.append("lease_time must be an integer")
    
    if "start_ip" in data and "end_ip" in data:
        try:
            start_ip = ipaddress.ip_address(data.get("start_ip"))
            end_ip = ipaddress.ip_address(data.get("end_ip"))
            if end_ip <= start_ip:
                errors.append("end_ip must be greater than start_ip")
        except ValueError:
            # Already handled above
            pass
    
    return jsonify({
        "valid": len(errors) == 0,
        "errors": errors
    })

def validate_apply_json(data):
    errors = []
    
    required_fields = ["device_ip", "username", "password", "config"]
    for field in required_fields:
        if not data.get(field):
            errors.append(f"{field} is required")
    
    if "device_ip" in data:
        try:
            ipaddress.ip_address(data.get("device_ip"))
        except ValueError:
            errors.append("Invalid device_ip format")
    
    if "device_type" in data and data["device_type"] not in ["cisco", "linux"]:
        errors.append("device_type must be either 'cisco' or 'linux'")
    
    return jsonify({
        "valid": len(errors) == 0,
        "errors": errors
    })

def validate_remove_json(data):
    errors = []
    
    required_fields = ["device_ip", "username", "password"]
    for field in required_fields:
        if not data.get(field):
            errors.append(f"{field} is required")
    
    if "device_ip" in data:
        try:
            ipaddress.ip_address(data.get("device_ip"))
        except ValueError:
            errors.append("Invalid device_ip format")
    
    if "device_type" in data and data["device_type"] not in ["cisco", "linux"]:
        errors.append("device_type must be either 'cisco' or 'linux'")
    
    return jsonify({
        "valid": len(errors) == 0,
        "errors": errors
    })

@app.route('/api/generate-config', methods=['POST', 'OPTIONS'])
def generate_config():
    if request.method == 'OPTIONS':
        return '', 204
        
    data = request.json
    device_type = data.get('device_type', 'cisco')
    
    if device_type == 'cisco':
        config = generate_cisco_config(data)
    else:  
        config = generate_linux_config(data)
    
    return jsonify({
        "success": True,
        "config": config
    })

@app.route('/api/apply-config', methods=['POST', 'OPTIONS'])
def apply_config():
    if request.method == 'OPTIONS':
        return '', 204
        
    data = request.json
    device_ip = data.get('device_ip')
    username = data.get('username')
    password = data.get('password')
    config = data.get('config')
    device_type = data.get('device_type', 'cisco')
    
    try:
        if device_type == 'cisco':
            success = apply_cisco_config(device_ip, username, password, config)
        else: 
            success = apply_linux_config(device_ip, username, password, config)
        
        if success:
            return jsonify({"success": True})
        else:
            return jsonify({"success": False, "error": "Failed to apply configuration"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

@app.route('/api/remove-dhcp', methods=['POST', 'OPTIONS'])
def remove_dhcp():
    if request.method == 'OPTIONS':
        return '', 204
        
    data = request.json
    device_ip = data.get('device_ip')
    username = data.get('username')
    password = data.get('password')
    pool_name = data.get('pool_name')  
    device_type = data.get('device_type', 'cisco')
    
    try:
        if device_type == 'cisco':
            success = remove_cisco_dhcp(device_ip, username, password, pool_name)
        else:  
            success = remove_linux_dhcp(device_ip, username, password)
        
        if success:
            return jsonify({"success": True, "message": "DHCP configuration successfully removed"})
        else:
            return jsonify({"success": False, "error": "Failed to remove DHCP configuration"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

def generate_cisco_config(data):
    pool_name = data.get('pool_name')
    start_ip = data.get('start_ip')
    end_ip = data.get('end_ip')
    gateway = data.get('gateway')
    dns = data.get('dns')
    lease_time = data.get('lease_time', 24)
    
    config = f"""ip dhcp pool {pool_name}
    network {start_ip} {end_ip}
    default-router {gateway}
    dns-server {dns}
    lease {lease_time}
"""
    return config

def generate_linux_config(data):
    pool_name = data.get('pool_name')
    start_ip = data.get('start_ip')
    end_ip = data.get('end_ip')
    gateway = data.get('gateway')
    dns = data.get('dns')
    lease_time = data.get('lease_time', 24)
    
    config = f"""subnet 192.168.10.0 netmask 255.255.255.0 {{
  range {start_ip} {end_ip};
  option routers {gateway};
  option domain-name-servers {dns};
  default-lease-time {lease_time * 3600};
  max-lease-time {lease_time * 3600 * 2};
}}
"""
    return config

def apply_cisco_config(device_ip, username, password, config):
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(device_ip, username=username, password=password)
        remote_conn = ssh.invoke_shell()
        
        remote_conn.send('enable\n')
        remote_conn.send('configure terminal\n')
        
        for line in config.split('\n'):
            if line.strip():
                remote_conn.send(line + '\n')
        
        remote_conn.send('end\n')
        remote_conn.send('write memory\n')
        
        import time
        time.sleep(2)
        
        ssh.close()
        return True
    except Exception as e:
        print(f"Error applying Cisco config: {str(e)}")
        return False

def apply_linux_config(device_ip, username, password, config):
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(device_ip, username=username, password=password)
        
        temp_file = '/tmp/dhcpd.conf.new'
        stdin, stdout, stderr = ssh.exec_command(f'echo "{config}" > {temp_file}')
        
        stdin, stdout, stderr = ssh.exec_command(f'sudo mv {temp_file} /etc/dhcp/dhcpd.conf && sudo systemctl restart isc-dhcp-server')
        
        ssh.close()
        return True
    except Exception as e:
        print(f"Error applying Linux config: {str(e)}")
        return False

def remove_cisco_dhcp(device_ip, username, password, pool_name=None):
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(device_ip, username=username, password=password)
        remote_conn = ssh.invoke_shell()
        
        # Send commands
        remote_conn.send('enable\n')
        remote_conn.send('configure terminal\n')
        
        if pool_name:
            # Remove specific DHCP pool
            remote_conn.send(f'no ip dhcp pool {pool_name}\n')
        else:
            # Remove all DHCP pools
            # First, get a list of all DHCP pools
            stdin, stdout, stderr = ssh.exec_command('show running-config | include ip dhcp pool')
            output = stdout.read().decode()
            
            # Parse the output to extract pool names
            pool_names = re.findall(r'ip dhcp pool (\S+)', output)
            
            # Remove each pool
            for pool in pool_names:
                remote_conn.send(f'no ip dhcp pool {pool}\n')
        
        # Disable DHCP service
        remote_conn.send('no service dhcp\n')
        
        remote_conn.send('end\n')
        remote_conn.send('write memory\n')
        
        # Wait for command execution
        import time
        time.sleep(2)
        
        ssh.close()
        return True
    except Exception as e:
        print(f"Error removing Cisco DHCP config: {str(e)}")
        return False

def remove_linux_dhcp(device_ip, username, password):
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(device_ip, username=username, password=password)
        
        # Create empty config file
        stdin, stdout, stderr = ssh.exec_command('echo "# DHCP configuration removed" | sudo tee /etc/dhcp/dhcpd.conf')
        
        # Stop and disable DHCP service
        stdin, stdout, stderr = ssh.exec_command('sudo systemctl stop isc-dhcp-server && sudo systemctl disable isc-dhcp-server')
        
        ssh.close()
        return True
    except Exception as e:
        print(f"Error removing Linux DHCP config: {str(e)}")
        return False

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)