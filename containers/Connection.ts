import { createContainer } from "unstated-next";
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { Observable } from "rxjs";
import { debounceTime } from "rxjs/operators";

type Provider = ethers.providers.Provider;
type Block = ethers.providers.Block;
type Network = ethers.providers.Network;
type ExternalProvider = ethers.providers.ExternalProvider;
type Signer = ethers.Signer;

function useConnection() {
  const [provider, setProvider] = useState<Provider | null>(null);
  const [signer, setSigner] = useState<Signer | null>(null);
  const [network, setNetwork] = useState<Network | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [block$, setBlock$] = useState<Observable<Block> | null>(null);

  const attemptConnection = async () => {
    if (window.ethereum === undefined) {
      throw Error("MetaMask not found");
    }

    // get provider and signer
    const provider = new ethers.providers.Web3Provider(
      window.ethereum as ExternalProvider
    );
    const signer = provider.getSigner();
    const network = await provider.getNetwork();

    // get address
    await provider.send("eth_requestAccounts", []);
    const address = await signer.getAddress();

    // make sure page refreshes when network is changed
    // https://github.com/MetaMask/metamask-extension/issues/8226
    window.ethereum.on("chainIdChanged", () => window.location.reload());
    window.ethereum.on("chainChanged", () => window.location.reload());

    // set states
    setProvider(provider);
    setSigner(signer);
    setNetwork(network);
    setAddress(address);
  };

  const connect = async () => {
    try {
      setError(null);
      await attemptConnection();
    } catch (error) {
      setError(error);
    }
  };

  // create observable to stream new blocks
  useEffect(() => {
    if (provider) {
      const observable = new Observable<Block>((subscriber) => {
        provider.on("block", (blockNumber) => {
          provider
            .getBlock(blockNumber)
            .then((block) => subscriber.next(block));
        });
      });
      // debounce to prevent subscribers making unnecessary calls
      const block$ = observable.pipe(debounceTime(2000))
      setBlock$(block$);
    }
  }, [provider]);

  return { provider, signer, network, address, connect, error, block$ };
}

const Connection = createContainer(useConnection);

export default Connection;
