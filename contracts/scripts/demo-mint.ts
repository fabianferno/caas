/**
 * demo-mint.ts -- Deploy AgentNFT + mint sample INFTs for pitch demo.
 *
 * Usage:
 *   npx hardhat run scripts/demo-mint.ts --network 0g-testnet
 *
 * Requires OG_DEPLOYER_PRIVATE_KEY in .env
 */

import { ethers, upgrades } from "hardhat";

const EXPLORER = "https://chainscan.0g.ai";

// Sample agents to mint
const AGENTS = [
  {
    name: "TravelBot",
    soul: "You are TravelBot, an AI travel concierge. You book flights, find hotels, and plan itineraries.",
    skills: '["search-flights","book-hotel","plan-itinerary"]',
    config: '{"tone":"friendly","channels":["telegram","web","x402"]}',
  },
  {
    name: "DeFiOracle",
    soul: "You are DeFiOracle, an autonomous DeFi analyst. You monitor yields, execute swaps, and alert on liquidation risks.",
    skills: '["monitor-yields","execute-swap","liquidation-alert"]',
    config: '{"tone":"professional","channels":["discord","x402"]}',
  },
  {
    name: "WeatherClaw",
    soul: "You are WeatherClaw, a weather intelligence agent. You provide real-time forecasts and severe weather alerts.",
    skills: '["current-weather","forecast","severe-alerts"]',
    config: '{"tone":"concise","channels":["whatsapp","telegram","web"]}',
  },
];

function hashData(content: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(content));
}

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("=".repeat(70));
  console.log("CaaS -- ERC-7857 Intelligent NFT Demo");
  console.log("=".repeat(70));
  console.log(`Network:  0G Chain testnet (chainId 16602)`);
  console.log(`Deployer: ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Balance:  ${ethers.formatEther(balance)} A0GI`);
  console.log();

  // Step 1: Deploy contract
  console.log("[1/3] Deploying AgentNFT (ERC-7857 UUPS proxy)...");
  const Factory = await ethers.getContractFactory("AgentNFT");
  const proxy = await upgrades.deployProxy(Factory, [deployer.address], {
    kind: "uups",
    initializer: "initialize",
  });
  await proxy.waitForDeployment();
  const contractAddr = await proxy.getAddress();

  console.log(`  Contract: ${contractAddr}`);
  console.log(`  Explorer: ${EXPLORER}/address/${contractAddr}`);
  console.log(`  Name:     CaaS Agent`);
  console.log(`  Symbol:   CLAW`);
  console.log();

  // Step 2: Mint INFTs
  console.log(`[2/3] Minting ${AGENTS.length} agent INFTs...`);
  console.log();

  const results: Array<{
    name: string;
    tokenId: string;
    txHash: string;
    dataHashes: string[];
  }> = [];

  for (const agent of AGENTS) {
    const intelligentData = [
      { dataDescription: "soul.md", dataHash: hashData(agent.soul) },
      { dataDescription: "skills.json", dataHash: hashData(agent.skills) },
      { dataDescription: "config.json", dataHash: hashData(agent.config) },
    ];

    const tx = await proxy.mint(intelligentData, deployer.address);
    const receipt = await tx.wait();

    const transferTopic = ethers.id("Transfer(address,address,uint256)");
    const transferLog = receipt.logs.find(
      (log: { topics: string[] }) => log.topics[0] === transferTopic
    );
    const tokenId = transferLog ? BigInt(transferLog.topics[3]).toString() : "?";

    results.push({
      name: agent.name,
      tokenId,
      txHash: receipt.hash,
      dataHashes: intelligentData.map((d) => d.dataHash),
    });

    console.log(`  ${agent.name} (Token #${tokenId})`);
    console.log(`    Tx:   ${EXPLORER}/tx/${receipt.hash}`);
    console.log(`    Data: ${intelligentData.length} encrypted blobs (soul, skills, config)`);
  }

  // Step 3: Verify on-chain
  console.log();
  console.log("[3/3] Verifying on-chain state...");
  console.log();

  for (const r of results) {
    const owner = await proxy.ownerOf(r.tokenId);
    const data = await proxy.intelligentDataOf(r.tokenId);

    console.log(`  Token #${r.tokenId} -- ${r.name}`);
    console.log(`    Owner:    ${owner}`);
    console.log(`    Data blobs: ${data.length}`);
    for (let i = 0; i < data.length; i++) {
      console.log(`      [${i}] ${data[i].dataDescription}: ${data[i].dataHash}`);
    }
    console.log();
  }

  // Summary
  console.log("=".repeat(70));
  console.log("PROOF SUMMARY");
  console.log("=".repeat(70));
  console.log();
  console.log(`Contract:     ${contractAddr}`);
  console.log(`Explorer:     ${EXPLORER}/address/${contractAddr}`);
  console.log(`Standard:     ERC-7857 (Intelligent NFT)`);
  console.log(`Chain:        0G Chain testnet (chainId 16602)`);
  console.log(`Total minted: ${results.length} agent INFTs`);
  console.log();
  console.log("Transactions:");
  for (const r of results) {
    console.log(`  #${r.tokenId} ${r.name.padEnd(15)} ${EXPLORER}/tx/${r.txHash}`);
  }
  console.log();
  console.log("Add to miniapp/.env.local:");
  console.log(`  AGENT_NFT_CONTRACT_ADDRESS=${contractAddr}`);
  console.log("=".repeat(70));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
