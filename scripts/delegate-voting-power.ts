import { ethers } from "hardhat"
import { Address } from "hardhat-deploy/dist/types"
import { MyERC20Votes } from "../typechain-types/"

const main = async (account: Address) => {
    const accounts = await ethers.getSigners()
    const deployer = accounts[0]
    const myERC20Votes: MyERC20Votes = await ethers.getContract(
        "MyERC20Votes",
        deployer
    )

    console.log("Delegating voting power ...")

    const transactionResponse = await myERC20Votes.delegate(account)
    await transactionResponse.wait(1)

    console.log("Vote token granted")
}

const account: Address = process.env.delegate_vote_to!
main(account)
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
