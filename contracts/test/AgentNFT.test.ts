import { expect } from "chai";
import { ethers, upgrades } from "hardhat";

describe("AgentNFT", () => {
  async function deploy() {
    const [owner, user1, user2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AgentNFT");
    const nft = await upgrades.deployProxy(Factory, [owner.address], { kind: "uups" });
    await nft.waitForDeployment();
    return { nft, owner, user1, user2 };
  }

  const sampleData = [
    { dataDescription: "soul.md",     dataHash: ethers.keccak256(ethers.toUtf8Bytes("soul")) },
    { dataDescription: "skills.json", dataHash: ethers.keccak256(ethers.toUtf8Bytes("skills")) },
    { dataDescription: "config.json", dataHash: ethers.keccak256(ethers.toUtf8Bytes("config")) },
  ];

  it("mints token ID 1 to the specified address", async () => {
    const { nft, owner } = await deploy();
    await nft.mint(sampleData, owner.address);
    expect(await nft.ownerOf(1)).to.equal(owner.address);
  });

  it("stores intelligentData on mint", async () => {
    const { nft, owner } = await deploy();
    await nft.mint(sampleData, owner.address);
    const data = await nft.intelligentDataOf(1);
    expect(data.length).to.equal(3);
    expect(data[0].dataDescription).to.equal("soul.md");
    expect(data[1].dataDescription).to.equal("skills.json");
    expect(data[2].dataDescription).to.equal("config.json");
  });

  it("increments token ID on successive mints", async () => {
    const { nft, owner, user1 } = await deploy();
    await nft.mint(sampleData, owner.address);
    await nft.mint(sampleData, user1.address);
    expect(await nft.ownerOf(1)).to.equal(owner.address);
    expect(await nft.ownerOf(2)).to.equal(user1.address);
  });

  it("iTransfer moves ownership and emits Transferred + PublishedSealedKey", async () => {
    const { nft, owner, user1 } = await deploy();
    await nft.mint(sampleData, owner.address);
    await expect(nft.iTransfer(user1.address, 1, []))
      .to.emit(nft, "Transferred").withArgs(owner.address, user1.address, 1)
      .and.to.emit(nft, "PublishedSealedKey").withArgs(1, "0x");
    expect(await nft.ownerOf(1)).to.equal(user1.address);
  });

  it("iTransfer reverts if caller is not owner", async () => {
    const { nft, owner, user1 } = await deploy();
    await nft.mint(sampleData, owner.address);
    await expect(nft.connect(user1).iTransfer(user1.address, 1, []))
      .to.be.revertedWith("AgentNFT: not owner");
  });

  it("iClone creates new token with same intelligentData", async () => {
    const { nft, owner, user1 } = await deploy();
    await nft.mint(sampleData, owner.address);
    await expect(nft.iClone(user1.address, 1, []))
      .to.emit(nft, "Cloned").withArgs(1, 2, user1.address);
    expect(await nft.ownerOf(2)).to.equal(user1.address);
    const clonedData = await nft.intelligentDataOf(2);
    expect(clonedData.length).to.equal(3);
    expect(clonedData[0].dataDescription).to.equal("soul.md");
  });

  it("authorizeUsage adds user to authorized list", async () => {
    const { nft, owner, user1 } = await deploy();
    await nft.mint(sampleData, owner.address);
    await expect(nft.authorizeUsage(1, user1.address))
      .to.emit(nft, "Authorization").withArgs(1, user1.address);
    const users = await nft.authorizedUsersOf(1);
    expect(users).to.include(user1.address);
  });

  it("revokeAuthorization removes user from authorized list", async () => {
    const { nft, owner, user1 } = await deploy();
    await nft.mint(sampleData, owner.address);
    await nft.authorizeUsage(1, user1.address);
    await expect(nft.revokeAuthorization(1, user1.address))
      .to.emit(nft, "AuthorizationRevoked").withArgs(1, user1.address);
    const users = await nft.authorizedUsersOf(1);
    expect(users).to.not.include(user1.address);
  });
});
