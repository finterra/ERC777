/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
const chai = require('chai');
const assert = chai.assert;
chai.use(require('chai-as-promised')).should();
const utils = require('./index');

exports.test = function(web3, accounts, token) {
  describe('operator', function() {
    beforeEach(async function() {
      await utils
        .mintForAllAccounts(web3, accounts, token, accounts[0], '10', 100000);
    });

    it(`should detect ${utils.formatAccount(accounts[3])} is not an operator ` +
      `for ${utils.formatAccount(accounts[1])}`, async function() {
      assert.isFalse(
        await token.contract.methods
          .isOperatorFor(accounts[3], accounts[1])
          .call()
      );
    });

    it(`should authorize ${utils.formatAccount(accounts[3])} as an operator ` +
      `for ${utils.formatAccount(accounts[1])}`, async function() {
      await token.contract.methods
        .authorizeOperator(accounts[3])
        .send({ from: accounts[1], gas: 300000 });

      assert.isTrue(
        await token.contract.methods
          .isOperatorFor(accounts[3], accounts[1])
          .call()
      );
    });

    it(`should let ${utils.formatAccount(accounts[3])} ` +
      `send 1.12 ${token.symbol} from ${utils.formatAccount(accounts[1])} ` +
      `to ${utils.formatAccount(accounts[2])}`, async function() {
      await token.contract.methods
        .authorizeOperator(accounts[3])
        .send({ from: accounts[1], gas: 300000 });

      await utils.assertTotalSupply(web3, token, 10 * accounts.length);
      await utils.assertBalance(web3, token, accounts[1], 10);
      await utils.assertBalance(web3, token, accounts[2], 10);

      await token.contract.methods
        .operatorSend(
          accounts[1], accounts[2], web3.utils.toWei('1.12'), '0x', '0x')
        .send({ gas: 300000, from: accounts[3] });

      await utils.getBlock(web3);
      await utils.assertTotalSupply(web3, token, 10 * accounts.length);
      await utils.assertBalance(web3, token, accounts[1], 8.88);
      await utils.assertBalance(web3, token, accounts[2], 11.12);
    });

    it(`should revoke ${utils.formatAccount(accounts[3])} as an operator for ` +
      `${utils.formatAccount(accounts[1])}`, async function() {
      await token.contract.methods
        .authorizeOperator(accounts[3])
        .send({ from: accounts[1], gas: 300000 });

      assert.isTrue(
        await token.contract.methods
          .isOperatorFor(accounts[3], accounts[1])
          .call()
      );

      await token.contract.methods
        .revokeOperator(accounts[3])
        .send({ from: accounts[1], gas: 300000 });

      await utils.getBlock(web3);
      assert.isFalse(
        await token.contract.methods
          .isOperatorFor(accounts[3], accounts[1])
          .call()
      );
    });

    it(`should not let ${utils.formatAccount(accounts[3])} send from ` +
      `${utils.formatAccount(accounts[1])} (not operator)`, async function() {
      await utils.assertTotalSupply(web3, token, 10 * accounts.length);
      await utils.assertBalance(web3, token, accounts[1], 10);
      await utils.assertBalance(web3, token, accounts[2], 10);

      await token.contract.methods
        .operatorSend(
          accounts[1], accounts[2], web3.utils.toWei('3.72'), '0x', '0x')
        .send({ gas: 300000, from: accounts[3] })
        .should.be.rejectedWith('revert');

      await utils.getBlock(web3);
      await utils.assertTotalSupply(web3, token, 10 * accounts.length);
      await utils.assertBalance(web3, token, accounts[1], 10);
      await utils.assertBalance(web3, token, accounts[2], 10);
    });

    it(`should not let ${utils.formatAccount(accounts[3])} authorize himself ` +
      'as one of his own operators', async function() {
      await utils.assertTotalSupply(web3, token, 10 * accounts.length);
      await utils.assertBalance(web3, token, accounts[3], 10);

      await token.contract.methods
        .authorizeOperator(accounts[3])
        .send({ gas: 300000, from: accounts[3] })
        .should.be.rejectedWith('revert');

      await utils.getBlock(web3);
      await utils.assertTotalSupply(web3, token, 10 * accounts.length);
      await utils.assertBalance(web3, token, accounts[3], 10);
    });

    it(`should make ${utils.formatAccount(accounts[3])} ` +
      'an operator for himself by default', async function() {
      assert.isTrue(
        await token.contract.methods
          .isOperatorFor(accounts[3], accounts[3])
          .call()
      );
    });

    it(`should not let ${utils.formatAccount(accounts[3])} revoke himself ` +
      'as one of his own operators', async function() {
      await utils.assertTotalSupply(web3, token, 10 * accounts.length);
      await utils.assertBalance(web3, token, accounts[3], 10);

      await token.contract.methods
        .revokeOperator(accounts[3])
        .send({ gas: 300000, from: accounts[3] })
        .should.be.rejectedWith('revert');

      await utils.getBlock(web3);
      await utils.assertTotalSupply(web3, token, 10 * accounts.length);
      await utils.assertBalance(web3, token, accounts[3], 10);
    });

    it(`should let ${utils.formatAccount(accounts[3])} ` +
      'use operatorSend on himself', async function() {
      await utils.assertTotalSupply(web3, token, 10 * accounts.length);
      await utils.assertBalance(web3, token, accounts[3], 10);
      await utils.assertBalance(web3, token, accounts[2], 10);

      await token.contract.methods
        .operatorSend(
          accounts[3], accounts[2], web3.utils.toWei('3.72'), '0x', '0x')
        .send({ gas: 300000, from: accounts[3] });

      await utils.getBlock(web3);
      await utils.assertTotalSupply(web3, token, 10 * accounts.length);
      await utils.assertBalance(web3, token, accounts[3], 6.28);
      await utils.assertBalance(web3, token, accounts[2], 13.72);
    });
  });
};
