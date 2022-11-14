import { ethers } from "hardhat"
import { Address } from "hardhat-deploy/dist/types"
import { MyERC20Vote, tokenizedBallot } from "../typechain-types/"

const main = async (account: Address) => {
    const accounts = await ethers.getSigners()
    const deployer = accounts[0]
    const myERC20Votes: MyERC20Votes = await ethers.getContract(
        "MyERC20Votes",
        deployer
    )
    const tokenizedBallot: tokenizedBallot = await ethers.getContract(
        "TokenizedBallot",
        deployer
    )

    console.log("Giving voting tokens (10) ...")

    // const transactionResponse = await myERC20Votes.mint(account, 10)
    // await transactionResponse.wait(1)

    console.log("Vote token granted")
}

const account: Address = process.env.give_voting_token_to!
main(account)
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
