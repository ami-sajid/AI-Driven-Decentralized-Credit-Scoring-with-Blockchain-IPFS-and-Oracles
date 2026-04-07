// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title CreditScoreOracle
 * @dev Simple credit score contract for Remix IDE
 * @dev This emits events that our backend will listen to
 */
contract CreditScoreOracle {
    address public owner;
    
    // Track requests
    mapping(bytes32 => bool) public pendingRequests;
    
    // Events for frontend and backend to listen to
    event CreditScoreRequested(
        bytes32 indexed requestId,
        address indexed requester,
        string userId,
        string userName,
        uint256 timestamp
    );
    
    event CreditScoreReceived(
        bytes32 indexed requestId,
        string userId,
        uint256 creditScore,
        uint256 timestamp,
        string ipfsCID
    );

    // Modifier for owner-only functions
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @dev Request credit score - anyone can call this
     * @param _userId User ID to check
     * @param _userName User name for verification
     */
    function requestCreditScore(string memory _userId, string memory _userName) 
        external 
        returns (bytes32) 
    {
        require(bytes(_userId).length > 0, "User ID required");
        require(bytes(_userName).length > 0, "User name required");
        
        // Create unique request ID
        bytes32 requestId = keccak256(abi.encodePacked(
            _userId, 
            _userName, 
            block.timestamp, 
            msg.sender
        ));
        
        pendingRequests[requestId] = true;
        
        emit CreditScoreRequested(
            requestId,
            msg.sender,
            _userId,
            _userName,
            block.timestamp
        );
        
        return requestId;
    }

    /**
     * @dev Backend will call this to send the credit score
     * @param _requestId Original request ID
     * @param _userId User ID
     * @param _creditScore The actual credit score
     * @param _ipfsCID IPFS proof
     */
    function fulfillCreditScore(
        bytes32 _requestId,
        string memory _userId,
        uint256 _creditScore,
        string memory _ipfsCID
    ) external onlyOwner {
        require(pendingRequests[_requestId], "Request not found");
        
        pendingRequests[_requestId] = false;
        
        emit CreditScoreReceived(
            _requestId,
            _userId,
            _creditScore,
            block.timestamp,
            _ipfsCID
        );
    }

    /**
     * @dev Check if request is pending
     */
    function isRequestPending(bytes32 _requestId) external view returns (bool) {
        return pendingRequests[_requestId];
    }
}