import { ethers, getNamedAccounts } from "hardhat"
import { PROPOSALS } from "../deploy/02-deploy-tokenized-ballot"
import { TokenizedBallot } from "../typechain-types/"

const main = async (_proposalIndex: number) => {
    const accounts = await ethers.getSigners()
    const voter = accounts[0]

    const tokenizedBallot: TokenizedBallot = await ethers.getContract(
        "TokenizedBallot",
        voter
    )

    // const ballotFactory = await ethers.getContractFactory("Ballot")
    // const ballot = ballotFactory.attach("0x07048F6Fc40C8cf962396e62D3D4dd83dB225a00")

    console.log(`Voting with ${voter} to ${PROPOSALS[_proposalIndex]} ...`)

    const transactionResponse = await tokenizedBallot.vote(
        _proposalIndex.toString(),
        10
    )
    await transactionResponse.wait(1)

    console.log("Vote registered successfully !!!")
    console.log("__________________________________________________")
}

const proposalIndex: number = parseInt(process.env.proposalIndex!)
main(proposalIndex)
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
