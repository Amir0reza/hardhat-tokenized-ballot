import { DeployFunction } from "hardhat-deploy/dist/types"
import { HardhatRuntimeEnvironment } from "hardhat/types"
import verify from '../utils/verify';

const deployMyERC20Votes: DeployFunction = async function (
    hre: HardhatRuntimeEnvironment
) {
    const { deployments, ethers, network } = hre
    const { deploy, log } = deployments

    const deployer = (await ethers.getSigners())[0]
    log(`The deployer address is: ${deployer}`)

    const chainId = network.config.chainId

    let args: any = []
    log("Deploying myERC20Votes and waiting for confirmations...")
    const myERC20Votes = await deploy("MyERC20Votes", {
        from: deployer.address,
        log: true,
        args: args,
        waitConfirmations: 1,
    })

    log(`myERC20Votes deployed at ${myERC20Votes.address}`)
    log("__________________________________________________")

    if (chainId != 31337 && process.env.ETHERSCAN_API_KEY) {
        // verify the code
        await verify(myERC20Votes.address, args)
    }
}

export default deployMyERC20Votes
deployMyERC20Votes.tags = ["all", "myERC20Votes"]
