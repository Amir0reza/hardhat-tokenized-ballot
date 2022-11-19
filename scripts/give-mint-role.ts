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

    console.log("Giving minting role ...")

    const minterRole = ethers.utils.keccak256(
        ethers.utils.hexlify(
            ethers.utils.toUtf8Bytes("MINTER_ROLE")
        )
    )

    const transactionResponse = await myERC20Votes.setRoleAdmin(minterRole, minterRole)
    await transactionResponse.wait(1)

    console.log("Minter role granted")
}

const account: Address = process.env.minter_role_to!
main(account)
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
