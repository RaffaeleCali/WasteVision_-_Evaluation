echo 'Installazione di kubectl...'
curl -LO https://storage.googleapis.com/kubernetes-release/release/$(curl -s https://storage.googleapis.com/kubernetes-release/release/stable.txt)/bin/linux/amd64/kubectl 
chmod +x ./kubectl
sudo mv ./kubectl /usr/local/bin/kubectl 

echo 'Installazione di Docker...'
sudo yum update -y && sudo yum install -y docker 
sudo systemctl start docker 
sudo systemctl enable docker 
sudo usermod -a -G docker $(whoami)

sg docker -c "

    echo 'Installazione di Minikube...'
    curl -Lo minikube https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64 
    chmod +x minikube
    sudo mv minikube /usr/local/bin/
"
