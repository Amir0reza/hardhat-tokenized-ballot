import { DeployFunction } from "hardhat-deploy/dist/types"
import { HardhatRuntimeEnvironment } from "hardhat/types"
import verify from "../utils/verify"
import { ethers } from "hardhat"

export const PROPOSALS = ["Chocolate", "Vanilla", "Lemon", "Almond"]
export const TARGET_BLOCK_NUMBER = 4//7994956

function convertStringArrayToBytes32(array: string[]) {
    const bytes32Array = []
    for (let i = 0; i < array.length; i++) {
        bytes32Array.push(ethers.utils.formatBytes32String(array[i]))
    }
    return bytes32Array
}

const deployTokenizedBallot: DeployFunction = async function (
    hre: HardhatRuntimeEnvironment
) {
    const { deployments, network } = hre
    const { deploy, log } = deployments

    const myERC20Votes = await ethers.getContract("MyERC20Votes")
    const myERC20VotesAddress = myERC20Votes.address

    const deployer = (await ethers.getSigners())[0]
    log(`The deployer address is: ${deployer.address}`)

    const chainId = network.config.chainId

    let args = [
        convertStringArrayToBytes32(PROPOSALS),
        myERC20VotesAddress,
        TARGET_BLOCK_NUMBER,
        "TokenizedBallot"
    ]
    log("Deploying TokenizedBallot and waiting for confirmations...")
    const tokenizedBallot = await deploy("TokenizedBallot", {
        from: deployer.address,
        log: true,
        args: args,
        waitConfirmations: 1,
    })

    log(`TokenizedBallot deployed at ${tokenizedBallot.address}`)
    log("__________________________________________________")

    if (chainId != 31337 && process.env.ETHERSCAN_API_KEY) {
        // verify the code
        await verify(tokenizedBallot.address, args)
    }
}

export default deployTokenizedBallot
deployTokenizedBallot.tags = ["all", "TokenizedBallot"]