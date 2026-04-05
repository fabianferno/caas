import { ethers, upgrades } from "hardhat";
import { writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying AgentNFT with:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", ethers.formatEther(balance), "A0GI");

  const Factory = await ethers.getContractFactory("AgentNFT");
  const proxy = await upgrades.deployProxy(Factory, [deployer.address], {
    kind: "uups",
    initializer: "initialize",
  });
  await proxy.waitForDeployment();

  const address = await proxy.getAddress();
  console.log("AgentNFT proxy deployed to:", address);
  console.log("\nAdd to miniapp/.env.local:");
  console.log(`AGENT_NFT_CONTRACT_ADDRESS=${address}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
