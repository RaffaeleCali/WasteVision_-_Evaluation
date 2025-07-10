terraform {
  required_version = ">= 1.7"
  required_providers {
    aws  = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    null = {                      
      source  = "hashicorp/null"
      version = "~> 3.0"
    }
  }
}


############################################
#  Variables
############################################
variable "region" {
  description = "AWS region"
  type        = string
  default     = "eu-north-1"
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.medium"  #g4dn.xlarge  0.70 h g6.xlarge 1.02 h g6.xlarge 1.2 h c6in.xlarge
}

variable "key_name" {
  description = "Name of an existing EC2 key‑pair for SSH"
  type        = string
  default     = "chiave2"
}

variable "ssh_cidr" {
  description = "CIDR allowed to SSH (port 22). Limit to your IP/network in production!"
  type        = string
  default     = "0.0.0.0/0"
}

variable "app_cidr" {
  description = "CIDR allowed to reach the public app (ports 80/443)"
  type        = string
  default     = "0.0.0.0/0"
}

variable "root_volume_size" {
  description = "Root EBS volume size in GiB"
  type        = number
  default     = 30
}

variable "tags" {
  description = "Extra resource tags"
  type        = map(string)
  default     = {}
}

############################################
#  Locals
############################################
locals {
  # Porta/e pubbliche dell'applicazione (HTTP/HTTPS)
  open_app_ports = [30080]  # [80, 443]
}

############################################
#  Provider
############################################
provider "aws" {
  region = var.region
}

############################################
#  Security Group
############################################
resource "aws_security_group" "minikube_sg" {
  name        = "minikube-sg"
  description = "Allow SSH + public app ports (80/443)"

  # App ports (HTTP / HTTPS)
  dynamic "ingress" {
    for_each = toset(local.open_app_ports)
    content {
      description = "App port ${ingress.value}"
      from_port   = ingress.value
      to_port     = ingress.value
      protocol    = "tcp"
      cidr_blocks = [var.app_cidr]
    }
  }

  # SSH access (limit this!)
  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.ssh_cidr]
  }

  # Outbound — allow all
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, {
    Name = "minikube-sg"
  })
}

############################################
#  EC2 Instance
############################################
resource "aws_instance" "minikube" {
  ami                    = "ami-02db68a01488594c5"  # Amazon Linux 2 (eu-north-1)
  instance_type          = var.instance_type
  key_name               = var.key_name
  vpc_security_group_ids = [aws_security_group.minikube_sg.id]

  root_block_device {
    volume_size = var.root_volume_size
    volume_type = "gp3"
  }

  user_data = <<-EOF
              #!/bin/bash
              yum update -y
              EOF

  tags = merge(var.tags, {
    Name = "minikube-instance"
  })
}

############################################
#  Outputs & Helpers
############################################
output "instance_public_ip" {
  description = "Public IP of the Minikube EC2 instance"
  value       = aws_instance.minikube.public_ip
}

# Scrive/aggiorna .env in root con l'IP dell'istanza
resource "null_resource" "write_env" {
  triggers = {
    ip = aws_instance.minikube.public_ip
  }

  provisioner "local-exec" {
    command = <<EOT
      echo INSTANCE_PUBLIC_IP=${aws_instance.minikube.public_ip} > ${path.module}/../.env
    EOT
  }
}
