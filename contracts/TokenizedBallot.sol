// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.7.0 <0.9.0;

import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

interface IMyERC20Votes {
    function getPastVotes(
        address account,
        uint256 blockNumber
    ) external view returns (uint256);
}

error NotEnoughVotingPower(uint256 required, uint256 inControl);

contract TokenizedBallot is EIP712 {
    using Counters for Counters.Counter;

    bytes32 private constant _VOTE_TYPEHASH =
        keccak256(
            "voteBySig(uint256 proposal,uint256 amount,uint256 nonce,uint256 expiry)"
        );

    struct Proposal {
        bytes32 name;
        uint256 voteCount;
    }
    IMyERC20Votes public immutable tokenContract;
    uint256 public targetBlockNumber;
    Proposal[] public proposals;

    mapping(address => uint256) public votingPowerSpent;
    mapping(address => Counters.Counter) private _nonces;

    /* Events */
    event Vote(
        address indexed voter,
        uint256 indexed proposal,
        uint256 indexed amount
    );

    constructor(
        bytes32[] memory proposalNames,
        address _tokenContractAddress,
        uint256 _targetBlockNumber,
        string memory name
    ) EIP712(name, "1") {
        tokenContract = IMyERC20Votes(_tokenContractAddress);
        targetBlockNumber = _targetBlockNumber;
        for (uint256 i = 0; i < proposalNames.length; i++) {
            proposals.push(Proposal({name: proposalNames[i], voteCount: 0}));
        }
    }

    function vote(uint256 proposal, uint256 amount) external {
        uint256 _votingPower = votingPower(msg.sender);
        if (_votingPower < amount)
            revert NotEnoughVotingPower(amount, _votingPower);
        votingPowerSpent[msg.sender] += amount;
        proposals[proposal].voteCount += amount;
        emit Vote(msg.sender, proposal, amount);
    }

    function voteBySig(
        uint256 proposal,
        uint256 amount,
        uint256 nonce,
        uint256 expiry,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        uint256 _votingPower = votingPower(msg.sender);
        if (_votingPower < amount)
            revert NotEnoughVotingPower(amount, _votingPower);

        require(block.timestamp <= expiry, "Signature expired");

        address signer = ECDSA.recover(
            _hashTypedDataV4(
                keccak256(
                    abi.encode(_VOTE_TYPEHASH, proposal, amount, nonce, expiry)
                )
            ),
            v,
            r,
            s
        );
        require(nonce == _useNonce(signer), "Invalid nonce");
        votingPowerSpent[signer] += amount;
        proposals[proposal].voteCount += amount;
        emit Vote(signer, proposal, amount);
    }

    /**
     * @dev See {IERC20Permit-nonces}.
     */
    function nonces(address owner) public view returns (uint256) {
        return _nonces[owner].current();
    }

    function votingPower(address account) public view returns (uint256) {
        return
            tokenContract.getPastVotes(account, targetBlockNumber) -
            votingPowerSpent[account];
    }

    function winningProposal() public view returns (uint256 winningProposal_) {
        uint256 winningVoteCount = 0;
        for (uint256 p = 0; p < proposals.length; p++) {
            if (proposals[p].voteCount > winningVoteCount) {
                winningVoteCount = proposals[p].voteCount;
                winningProposal_ = p;
            }
        }
    }

    function winnerName() external view returns (bytes32 winnerName_) {
        winnerName_ = proposals[winningProposal()].name;
    }

    /**
     * @dev "Consume a nonce": return the current value and increment.
     *
     * _Available since v4.1._
     */
    function _useNonce(
        address owner
    ) internal virtual returns (uint256 current) {
        Counters.Counter storage nonce = _nonces[owner];
        current = nonce.current();
        nonce.increment();
    }
}
