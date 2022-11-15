import { ethers } from "hardhat"
import { Address } from 'hardhat-deploy/dist/types';
import { TokenizedBallot } from "../typechain-types/"

const main = async (account: Address) => {
  const tokenizedBallot: TokenizedBallot = await ethers.getContract("TokenizedBallot")

//   const ballotFactory = await ethers.getContractFactory("Ballot")
//   const ballot = ballotFactory.attach("0x07048F6Fc40C8cf962396e62D3D4dd83dB225a00")

  const votingPower = await tokenizedBallot.votingPower(account)

  console.log(`Account ${account} has ${votingPower.toString()} voting power!!!`)
  console.log("__________________________________________________")
}

const account: Address = process.env.account_voting_power!
main(account)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })