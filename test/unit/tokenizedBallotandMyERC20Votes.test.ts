import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { network, ethers, deployments } from "hardhat"
import { TokenizedBallot, MyERC20Votes } from "../../typechain-types/"
import { expect, assert } from "chai"
import {
    PROPOSALS,
    TARGET_BLOCK_NUMBER,
} from "../../deploy/02-deploy-tokenized-ballot"
import { Address } from "hardhat-deploy/dist/types"

const abiCoder = new ethers.utils.AbiCoder()

// const chainId = network.config.chainId
const chainId = network.config.chainId

function buildDomainSeparator(
    _typeHash: any,
    _nameHash: any,
    _versionHash: any,
    _chainId: any,
    _addressThis: Address
) {
    return ethers.utils.keccak256(
        abiCoder.encode(
            ["bytes32", "bytes32", "bytes32", "uint256", "address"],
            [_typeHash, _nameHash, _versionHash, _chainId, _addressThis]
        )
    )
}

async function buildEIP712HashPermit(
    _permitTypeHash: string,
    _owner: Address,
    _spender: Address,
    _value: any,
    _deadline: any,
    _CACHED_DOMAIN_SEPARATOR: any
) {
    const _nonce = await ethers.provider.getTransactionCount(_owner)
    const structHash = ethers.utils.keccak256(
        abiCoder.encode(
            ["bytes32", "address", "address", "uint256", "uint256", "uint256"],
            [_permitTypeHash, _owner, _spender, _value, _nonce, _deadline]
        )
    )
    const hash = ethers.utils.keccak256(
        ethers.utils.solidityPack(
            ["string", "bytes32", "bytes32"],
            ["\x19\x01", _CACHED_DOMAIN_SEPARATOR, structHash]
        )
    )
    return hash
}

if (chainId != 31337) {
    describe.skip
} else {
    describe("Unit tests", function () {
        let tokenizedBallot: TokenizedBallot
        let myERC20Votes: MyERC20Votes
        let deployer: SignerWithAddress,
            acc1: SignerWithAddress,
            acc2: SignerWithAddress
        beforeEach(async function () {
            const accounts = await ethers.getSigners()
            deployer = accounts[0]
            acc1 = accounts[1]
            acc2 = accounts[2]
            await deployments.fixture(["all"])
            tokenizedBallot = await ethers.getContract(
                "TokenizedBallot",
                deployer
            )
            myERC20Votes = await ethers.getContract("MyERC20Votes", deployer)
        })

        describe("Tokenized Ballot Contract", function () {
            describe("Constructor", function () {
                it("Sets token contract address correctly", async () => {
                    expect(await tokenizedBallot.tokenContract()).to.eq(
                        myERC20Votes.address
                    )
                })

                it("Sets target block number correctly", async () => {
                    expect(await tokenizedBallot.targetBlockNumber()).to.eq(
                        TARGET_BLOCK_NUMBER
                    )
                })

                it("It has provided some proposals", async () => {
                    for (let index = 0; index < PROPOSALS.length; index++) {
                        const proposalName = (
                            await tokenizedBallot.proposals(index)
                        ).name
                        expect(
                            ethers.utils.parseBytes32String(proposalName)
                        ).to.eq(PROPOSALS[index])
                    }
                })

                it("All proposals has zero votes", async () => {
                    for (let index = 0; index < PROPOSALS.length; index++) {
                        const proposalVoteCount = (
                            await tokenizedBallot.proposals(index)
                        ).voteCount
                        expect(proposalVoteCount.toString()).to.eq("0")
                    }
                })
            })

            describe("vote function", function () {
                beforeEach(async () => {
                    await myERC20Votes.mint(deployer.address, 10)
                    await myERC20Votes.delegate(acc1.address)
                })

                it("change vote correctly", async () => {
                    const votingPower = await myERC20Votes.getPastVotes(
                        acc1.address,
                        0
                    )
                    await tokenizedBallot.connect(acc1).vote(1, 10)
                    const expectedVotes = (await tokenizedBallot.proposals(1)).voteCount
                    expect(expectedVotes.toString()).to.eq("10")
                })
            })
        })

        describe("My ERC20 Votes Contract", function () {
            describe("Main Contract", function () {
                describe("Constructor", async () => {
                    it("Sets the default admin role to deployer", async () => {
                        const adminRole =
                            await myERC20Votes.DEFAULT_ADMIN_ROLE()
                        const deployerRole = await myERC20Votes.hasRole(
                            adminRole,
                            deployer.address
                        )
                        expect(deployerRole).to.eq(true)
                    })

                    it("Sets the minter role to deployer", async () => {
                        const minterRole = await myERC20Votes.MINTER_ROLE()
                        const deployerRole = await myERC20Votes.hasRole(
                            minterRole,
                            deployer.address
                        )
                        expect(deployerRole).to.eq(true)
                    })
                })

                describe("mint function", function () {
                    it("It mints token to deployer account", async () => {
                        await myERC20Votes.mint(deployer.address, 1000)
                        const deployerBalance = await myERC20Votes.balanceOf(
                            deployer.address
                        )
                        expect(deployerBalance.toString()).to.eq("1000")
                    })

                    it("Emit Transfer event from address 0 to account 1 1000 token", async () => {
                        await expect(myERC20Votes.mint(acc1.address, 1000))
                            .to.emit(myERC20Votes, "Transfer")
                            .withArgs(
                                ethers.constants.AddressZero,
                                acc1.address,
                                1000
                            )
                    })

                    it("Reverts if try to mint more than maximum of uint224, (Overflow protection)", async () => {
                        const num1 = ethers.BigNumber.from(1)
                        const num2 = ethers.BigNumber.from(2)
                        const num224 = ethers.BigNumber.from(224)
                        const maxUint224 = num2.pow(num224).sub(num1)
                        await expect(
                            myERC20Votes.mint(
                                acc1.address,
                                maxUint224.add(num1)
                            )
                        ).to.revertedWith(
                            "ERC20Votes: total supply risks overflowing votes"
                        )
                    })

                    it("Updates the chechpoint of total supply correctly", async () => {
                        await myERC20Votes.mint(acc1.address, 1000)
                        await network.provider.send("evm_increaseTime", [1]) // use a higher number here if this test fails
                        await network.provider.request({
                            method: "evm_mine",
                            params: [],
                        })
                        const currentBlockNumber =
                            await ethers.provider.getBlockNumber()
                        const votesAcc1 = await myERC20Votes.getPastTotalSupply(
                            currentBlockNumber - 1
                        )
                        expect(votesAcc1.toString()).to.eq("1000")
                    })
                })

                describe("setRoleAdmin function", function () {
                    const minterRole = ethers.utils.keccak256(
                        ethers.utils.hexlify(
                            ethers.utils.toUtf8Bytes("MINTER_ROLE")
                        )
                    )
                    const minterAdmin = ethers.utils.keccak256(
                        ethers.utils.hexlify(
                            ethers.utils.toUtf8Bytes("MINTER_ADMIN")
                        )
                    )
                    const defaultAdminRole: string =
                        "0x0000000000000000000000000000000000000000000000000000000000000000"

                    it("Sets ('MINTER_ADMIN') admin Role for minter role correctly", async () => {
                        await myERC20Votes.setRoleAdmin(minterRole, minterAdmin)
                        const expectedAdminRole =
                            await myERC20Votes.getRoleAdmin(minterRole)
                        expect(expectedAdminRole).to.eq(minterAdmin)
                    })

                    it("Emits event correctly", async () => {
                        expect(
                            await myERC20Votes.setRoleAdmin(
                                minterRole,
                                minterAdmin
                            )
                        )
                            .to.emit("myERC20Votes", "RoleAdminChanged")
                            .withArgs(minterRole, defaultAdminRole, minterAdmin)
                    })
                })
            })

            describe("ERC20", function () {
                describe("Constructor", function () {
                    it("Check if the name is set correctly", async () => {
                        const tokenName = await myERC20Votes.name()
                        assert.equal(tokenName.toString(), "MyERC20Votes")
                    })

                    it("Check if the symbol is set correctly", async () => {
                        const tokenSymbol = await myERC20Votes.symbol()
                        assert.equal(tokenSymbol.toString(), "MTK")
                    })

                    it("Check is the token has 18 decimals", async () => {
                        const decimals = await myERC20Votes.decimals()
                        assert.equal(decimals, 18)
                    })

                    it("Check if the totalSupply is equal to zero", async () => {
                        const totalSupply = await myERC20Votes.totalSupply()
                        assert.equal(totalSupply.toString(), "0")
                    })
                })

                describe("transfer function", function () {
                    beforeEach(async () => {
                        await myERC20Votes.mint(deployer.address, 1000)
                    })

                    it("transfer money from deployer to account 1", async () => {
                        await myERC20Votes.transfer(acc1.address, 1000)
                        const acc1Balance = await myERC20Votes.balanceOf(
                            acc1.address
                        )
                        assert.equal(acc1Balance.toString(), "1000")
                    })

                    it("It revert if caller doesn't have enough balance", async () => {
                        await expect(
                            myERC20Votes
                                .connect(acc1)
                                .transfer(deployer.address, 1000)
                        ).to.be.revertedWith(
                            "ERC20: transfer amount exceeds balance"
                        )
                    })

                    it("It revert if transfer money to address zero", async () => {
                        await expect(
                            myERC20Votes.transfer(
                                ethers.constants.AddressZero,
                                1000
                            )
                        ).to.be.revertedWith(
                            "ERC20: transfer to the zero address"
                        )
                    })
                })

                describe("approve function", function () {
                    beforeEach(async () => {
                        await myERC20Votes.mint(deployer.address, 1000)
                    })

                    it("approve account 1 to spend on behalf of deployer", async () => {
                        await myERC20Votes.approve(acc1.address, 1000)
                        const account1Allowance = await myERC20Votes.allowance(
                            deployer.address,
                            acc1.address
                        )
                        assert.equal(account1Allowance.toString(), "1000")
                    })

                    it("It revert if approve address zero to spend on behalf of deployer", async () => {
                        await expect(
                            myERC20Votes.approve(
                                ethers.constants.AddressZero,
                                1000
                            )
                        ).to.be.revertedWith(
                            "ERC20: approve to the zero address"
                        )
                    })

                    it("emit Approval event from address 0 to account 1 1000 token", async () => {
                        await expect(myERC20Votes.approve(acc1.address, 1000))
                            .to.emit(myERC20Votes, "Approval")
                            .withArgs(deployer.address, acc1.address, 1000)
                    })
                })

                describe("transferFrom function", function () {
                    beforeEach(async () => {
                        await myERC20Votes.mint(deployer.address, 1000)
                        await myERC20Votes.approve(acc1.address, 1000)
                    })

                    it("transfer 1000 token from deployer to account 1", async () => {
                        await myERC20Votes
                            .connect(acc1)
                            .transferFrom(deployer.address, acc1.address, 1000)
                        const acc1Balance = await myERC20Votes.balanceOf(
                            acc1.address
                        )
                        assert.equal(acc1Balance.toString(), "1000")
                    })

                    it("it reverts if the transfer amount is more than allowance", async () => {
                        await expect(
                            myERC20Votes.transferFrom(
                                deployer.address,
                                acc1.address,
                                2000
                            )
                        ).to.be.revertedWith("ERC20: insufficient allowance")
                    })

                    it("reduce the allowance of acccount 1 when transfer money", async () => {
                        await myERC20Votes
                            .connect(acc1)
                            .transferFrom(deployer.address, acc1.address, 1000)
                        const account1Allowance = await myERC20Votes.allowance(
                            deployer.address,
                            acc1.address
                        )
                        assert.equal(account1Allowance.toString(), "0")
                    })
                })

                describe("increaseAllowance function", function () {
                    it("increase the allowance of account 1 to 2000", async () => {
                        await myERC20Votes.increaseAllowance(acc1.address, 2000)
                        const account1Allowance = await myERC20Votes.allowance(
                            deployer.address,
                            acc1.address
                        )
                        assert.equal(account1Allowance.toString(), "2000")
                    })
                })

                describe("decreaseAllowance function", function () {
                    it("decrease the allowance of account 1 to 1000", async () => {
                        await myERC20Votes.increaseAllowance(acc1.address, 2000)
                        await myERC20Votes.decreaseAllowance(acc1.address, 1000)
                        const account1Allowance = await myERC20Votes.allowance(
                            deployer.address,
                            acc1.address
                        )
                        assert.equal(account1Allowance.toString(), "1000")
                    })
                })
            })

            describe("AccessControl", function () {
                const minterRole = ethers.utils.keccak256(
                    ethers.utils.hexlify(
                        ethers.utils.toUtf8Bytes("MINTER_ROLE")
                    )
                )
                const defaultAdminRole: string =
                    "0x0000000000000000000000000000000000000000000000000000000000000000"
                describe("Constructor", function () {
                    it("Sets the default admin role correctly", async () => {
                        const expectAdminRole =
                            await myERC20Votes.DEFAULT_ADMIN_ROLE()
                        expect(expectAdminRole).to.eq(defaultAdminRole)
                    })

                    it("Sets the minter role correctly", async () => {
                        const expectMinterRole =
                            await myERC20Votes.MINTER_ROLE()
                        expect(expectMinterRole).to.eq(minterRole)
                    })
                })

                describe("grantRole function", function () {
                    it("Sets account 1 correct as a minter", async () => {
                        await myERC20Votes.grantRole(minterRole, acc1.address)
                        const acc1Role = await myERC20Votes.hasRole(
                            minterRole,
                            acc1.address
                        )
                        expect(acc1Role).to.eq(true)
                    })

                    it("Revers if not called by the role admin", async () => {
                        await expect(
                            myERC20Votes
                                .connect(acc1)
                                .grantRole(minterRole, acc2.address)
                        ).to.reverted
                    })
                })

                describe("revokeRole function", function () {
                    beforeEach(async () => {
                        await myERC20Votes.grantRole(minterRole, acc1.address)
                    })

                    it("Revokes account 1 from minter role", async () => {
                        await myERC20Votes.revokeRole(minterRole, acc1.address)
                        const acc1Role = await myERC20Votes.hasRole(
                            minterRole,
                            acc1.address
                        )
                        expect(acc1Role).to.eq(false)
                    })

                    it("emit RoleRevoked event", async () => {
                        expect(
                            await myERC20Votes.revokeRole(
                                minterRole,
                                acc1.address
                            )
                        )
                            .to.emit("myERC20Votes", "RoleRevoked")
                            .withArgs(
                                minterRole,
                                acc1.address,
                                deployer.address
                            )
                    })
                })

                describe("renounceRole function", function () {
                    beforeEach(async () => {
                        await myERC20Votes.grantRole(minterRole, acc1.address)
                    })

                    it("Renounce from the role", async () => {
                        await myERC20Votes
                            .connect(acc1)
                            .renounceRole(minterRole, acc1.address)
                        const acc1Role = await myERC20Votes.hasRole(
                            minterRole,
                            acc1.address
                        )
                        expect(acc1Role).to.eq(false)
                    })

                    it("Reverts if not called by account itself", async () => {
                        await expect(
                            myERC20Votes.renounceRole(minterRole, acc1.address)
                        ).to.revertedWith(
                            "AccessControl: can only renounce roles for self"
                        )
                    })
                })
            })

            describe("ERC20Permit", function () {
                const contractName: string = "MyERC20Votes"
                const version: string = "1"
                const _HASHED_NAME = ethers.utils.keccak256(
                    ethers.utils.hexlify(ethers.utils.toUtf8Bytes(contractName))
                )
                const _HASHED_VERSION = ethers.utils.keccak256(
                    ethers.utils.hexlify(ethers.utils.toUtf8Bytes(version))
                )
                const _CACHED_CHAIN_ID = chainId
                let _CACHED_DOMAIN_SEPARATOR: string
                let _CACHED_THIS
                const _TYPE_HASH = ethers.utils.keccak256(
                    ethers.utils.hexlify(
                        ethers.utils.toUtf8Bytes(
                            "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
                        )
                    )
                )

                const _PERMIT_TYPEHASH = ethers.utils.keccak256(
                    ethers.utils.hexlify(
                        ethers.utils.toUtf8Bytes(
                            "Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"
                        )
                    )
                )

                beforeEach(async () => {
                    _CACHED_THIS = myERC20Votes.address
                    _CACHED_DOMAIN_SEPARATOR = buildDomainSeparator(
                        _TYPE_HASH,
                        _HASHED_NAME,
                        _HASHED_VERSION,
                        _CACHED_CHAIN_ID,
                        _CACHED_THIS
                    )
                })

                describe("Constructor", async () => {
                    it("Correctly initialize the domain seperator", async () => {
                        const domainSeperatot =
                            await myERC20Votes.DOMAIN_SEPARATOR()
                        expect(domainSeperatot).to.eq(_CACHED_DOMAIN_SEPARATOR)
                    })
                })

                describe("Permit function", async () => {
                    it.skip("Approve spender to spend on behalf of owner", async () => {
                        const hash = await buildEIP712HashPermit(
                            _PERMIT_TYPEHASH,
                            acc1.address,
                            acc2.address,
                            1000,
                            10,
                            _CACHED_DOMAIN_SEPARATOR
                        )
                    })
                })
            })

            describe("ERC20Votes", function () {
                beforeEach(async () => {
                    await myERC20Votes.mint(acc1.address, 1000)
                })

                describe("delegate function", function () {
                    it("Account 1 can delegate to itself", async () => {
                        await myERC20Votes.connect(acc1).delegate(acc1.address)
                        const votingPower = await myERC20Votes.getVotes(
                            acc1.address
                        )
                        expect(votingPower.toString()).to.eq("1000")
                    })

                    it("Account 1 can delegate to account 2", async () => {
                        await myERC20Votes.connect(acc1).delegate(acc2.address)
                        const votingPower = await myERC20Votes.getVotes(
                            acc2.address
                        )
                        expect(votingPower.toString()).to.eq("1000")
                    })
                })
            })
        })
    })
}
