import { ethers } from "hardhat"
import { TokenizedBallot } from "../typechain-types/"

const main = async () => {
  const tokenizedBallot: TokenizedBallot = await ethers.getContract("TokenizedBallot")

  // const ballotFactory = await ethers.getContractFactory("Ballot")
  // const ballot = ballotFactory.attach("0x07048F6Fc40C8cf962396e62D3D4dd83dB225a00")

  const winnerProposalIndex = await tokenizedBallot.winningProposal()
  const winnerProposal = await tokenizedBallot.winnerName()
  const numberOfVotes = ((await tokenizedBallot.proposals(winnerProposalIndex)).voteCount).toString()

  console.log(`Proposal number ${winnerProposalIndex} which was ${ethers.utils.parseBytes32String(winnerProposal)}, won with total votes of ${numberOfVotes}!!!`)
  console.log("__________________________________________________")
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
